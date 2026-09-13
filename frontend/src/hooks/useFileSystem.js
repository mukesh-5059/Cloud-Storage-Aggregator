import { useState, useCallback, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';

export function useFileSystem(appJwt, activeRoomId, activeRoom, showToast, fetchRoomDashboard) {
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [fileItems, setFileItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [blockingOverlay, setBlockingOverlay] = useState(null);

  // Reset folder navigation only when switching to a different room
  useEffect(() => {
    setCurrentFolderId(null);
  }, [activeRoomId]);

  // Maintain root breadcrumb and update room name dynamically
  useEffect(() => {
    if (!activeRoomId) {
      setBreadcrumbs([]);
      setCurrentFolderId(null);
      setFileItems([]);
      return;
    }

    const roomName = activeRoom?.name || 'Root';
    setBreadcrumbs(prev => {
      if (prev.length === 0) {
        return [{ id: null, name: roomName }];
      }
      if (prev[0].name !== roomName) {
        const updated = [...prev];
        updated[0] = { ...updated[0], name: roomName };
        return updated;
      }
      return prev;
    });
  }, [activeRoomId, activeRoom?.name]);



  // Fetch Files inside Current Folder or Search Results
  const fetchDirectoryFiles = useCallback(async () => {
    if (!appJwt || !activeRoomId) return;

    setLoadingFiles(true);
    if (searchQuery.trim().length > 0) {
      try {
        const res = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: { Authorization: `Bearer ${appJwt}` }
        });
        if (res.ok) {
          const results = await res.json();
          setFileItems(results);
        }
      } catch (err) {
        console.error('Error searching files:', err);
      } finally {
        setLoadingFiles(false);
      }
      return;
    }

    try {
      const parentQuery = currentFolderId ? `?parent_id=${currentFolderId}` : '';
      const res = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}${parentQuery}`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const items = await res.json();
        setFileItems(items);
      }
    } catch (err) {
      console.error('Error fetching directory files:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, [appJwt, activeRoomId, currentFolderId, searchQuery]);

  // Refetch Files when Folder or Search Query Changes
  useEffect(() => {
    if (activeRoomId) {
      fetchDirectoryFiles();
    }
  }, [currentFolderId, searchQuery, activeRoomId, fetchDirectoryFiles]);

  // Download File Handler
  const handleDownloadFile = async (item) => {
    if (!item || item.is_folder) return;
    try {
      if (showToast) showToast(`Preparing download for "${item.name}"...`, 3000);
      const res = await fetch(`${BACKEND_URL}/files/${item.id}/download`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.download_url) {
          const a = document.createElement('a');
          a.href = data.download_url;
          a.target = '_blank';
          a.rel = 'noreferrer';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          if (showToast) showToast(`Could not obtain download link for "${item.name}"`, 4000);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404) {
          // Self-healing: Remove file from current state immediately & refresh directory/dashboard
          setFileItems(prev => prev.filter(f => f.id !== item.id));
          await fetchDirectoryFiles();
          if (fetchRoomDashboard && activeRoomId) {
            await fetchRoomDashboard(activeRoomId);
          }
        }
        if (showToast) showToast(err.detail || `Failed to download "${item.name}"`, 4500);
      }
    } catch (err) {
      console.error('Download error:', err);
      if (showToast) showToast(`Error downloading "${item.name}"`, 4000);
    }
  };

  // Directory Navigation Handlers
  const handleNavigateFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (crumb, idx) => {
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
  };

  // Folder Creation Handler
  const handleCreateFolder = async (folderName) => {
    setBlockingOverlay({
      title: 'Creating Folder',
      message: `Creating "${folderName}"...`,
      subtext: 'Updating directory tree structure...'
    });
    try {
      const res = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ name: folderName, parent_id: currentFolderId })
      });
      if (res.ok) {
        await fetchDirectoryFiles();
        if (showToast) showToast(`Created folder "${folderName}"`);
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    } finally {
      setBlockingOverlay(null);
    }
  };

  // File/Folder Deletion Handler
  const handleDeleteFile = async (item) => {
    if (!item) return;

    setBlockingOverlay({
      title: `Deleting ${item.is_folder ? 'Folder' : 'File'}`,
      message: `Deleting "${item.name}"...`,
      subtext: 'Re-indexing directory structure and freeing storage quota...'
    });

    try {
      const res = await fetch(`${BACKEND_URL}/files/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        await fetchDirectoryFiles();
        if (fetchRoomDashboard && activeRoomId) {
          await fetchRoomDashboard(activeRoomId);
        }
        if (showToast) showToast(`Deleted ${item.is_folder ? 'folder' : 'file'} "${item.name}"`);
      } else {
        const err = await res.json();
        if (showToast) showToast(err.detail || `Failed to delete "${item.name}"`, 4000);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      if (showToast) showToast(`Error deleting "${item.name}"`, 4000);
    } finally {
      setBlockingOverlay(null);
    }
  };

  return {
    currentFolderId,
    breadcrumbs,
    fileItems,
    searchQuery,
    setSearchQuery,
    loadingFiles,
    blockingOverlay,
    setBlockingOverlay,
    fetchDirectoryFiles,
    handleDownloadFile,
    handleNavigateFolder,
    handleNavigateBreadcrumb,
    handleCreateFolder,
    handleDeleteFile
  };
}
