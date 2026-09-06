import React, { useState, useEffect, useCallback } from 'react';
import NavigationRail from './components/NavigationRail';
import StorageHero from './components/StorageHero';
import FileExplorer from './components/FileExplorer';
import MemberSidebar from './components/MemberSidebar';
import AuthScreen from './components/AuthScreen';

// Modal System Components
import CreateJoinRoomModal from './components/modals/CreateJoinRoomModal';
import AllocateStorageModal from './components/modals/AllocateStorageModal';
import MoveFileModal from './components/modals/MoveFileModal';
import FilePreviewModal from './components/modals/FilePreviewModal';
import FileInfoDrawer from './components/modals/FileInfoDrawer';
import UserProfileModal from './components/modals/UserProfileModal';
import NewFolderModal from './components/modals/NewFolderModal';
import UploadFileModal from './components/modals/UploadFileModal';
import DeleteAccountModal from './components/modals/DeleteAccountModal';
import RenameItemModal from './components/modals/RenameItemModal';

const BACKEND_URL = 'http://localhost:8000';
const GOOGLE_CLIENT_ID = '338846147570-nqc50noev8fn4ma36hrpgaltq7jr43k4.apps.googleusercontent.com';

export default function App() {
  const [appJwt, setAppJwt] = useState(() => localStorage.getItem('app_jwt') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userNameInput, setUserNameInput] = useState('');
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Rooms & Dashboard State
  const [myRooms, setMyRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [storageData, setStorageData] = useState({ total_allocated_bytes: 0, total_used_bytes: 0 });
  const [roomMembers, setRoomMembers] = useState([]);

  // Directory & Filesystem State
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [fileItems, setFileItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels State
  const [isCreateJoinModalOpen, setIsCreateJoinModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);

  // Selected file targets for modals
  const [fileToMove, setFileToMove] = useState(null);
  const [fileToRename, setFileToRename] = useState(null);
  const [fileToPreview, setFileToPreview] = useState(null);
  const [fileForInfo, setFileForInfo] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateJoinModalOpen(false);
        setIsAllocateModalOpen(false);
        setIsProfileModalOpen(false);
        setIsDeleteAccountModalOpen(false);
        setIsUploadModalOpen(false);
        setIsNewFolderModalOpen(false);
        setIsMoveModalOpen(false);
        setIsRenameModalOpen(false);
        setIsPreviewModalOpen(false);
        setIsInfoDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Current User Profile
  const fetchMyProfile = useCallback(async () => {
    if (!appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        localStorage.removeItem('app_jwt');
        setAppJwt(null);
        setCurrentUser(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [appJwt]);

  // Fetch Joined Rooms
  const fetchMyRooms = useCallback(async () => {
    if (!appJwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const rooms = await res.json();
        setMyRooms(rooms);
        if (rooms.length > 0 && !activeRoomId) {
          setActiveRoomId(rooms[0].id);
        }
      } else if (res.status === 401) {
        localStorage.removeItem('app_jwt');
        setAppJwt(null);
        setCurrentUser(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [appJwt, activeRoomId]);

  // Fetch Consolidated Room Dashboard
  const fetchRoomDashboard = useCallback(async (roomId) => {
    if (!appJwt || !roomId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/dashboard`, {
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRoom(data.room);
        setStorageData(data.storage);
        setRoomMembers(data.members);
        // Reset breadcrumbs to root of active room
        setBreadcrumbs([{ id: null, name: data.room.name }]);
        setCurrentFolderId(null);
        setFileItems(data.root_files || []);
      }
    } catch (err) {
      console.error('Failed to load room dashboard:', err);
    }
  }, [appJwt]);

  // Fetch Files inside Current Folder
  const fetchDirectoryFiles = useCallback(async () => {
    if (!appJwt || !activeRoomId) return;

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
        console.error(err);
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
      console.error(err);
    }
  }, [appJwt, activeRoomId, currentFolderId, searchQuery]);

  // Initial Load Trigger
  useEffect(() => {
    if (appJwt) {
      fetchMyProfile();
      fetchMyRooms();
    }
  }, [appJwt, fetchMyProfile, fetchMyRooms]);

  // Load Dashboard on Room Switch
  useEffect(() => {
    if (activeRoomId) {
      fetchRoomDashboard(activeRoomId);
    }
  }, [activeRoomId, fetchRoomDashboard]);

  // Refetch Files when Folder or Search Query Changes
  useEffect(() => {
    if (activeRoomId) {
      fetchDirectoryFiles();
    }
  }, [currentFolderId, searchQuery, activeRoomId, fetchDirectoryFiles]);

  // Handle Google OAuth Sign In / Sign Up Code Exchange
  const handleGoogleAuth = (mode) => {
    setError(null);
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      setTimeout(() => {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          handleGoogleAuth(mode);
        } else {
          setError('Google Identity Services SDK is still loading. Please check your internet connection or refresh the page.');
        }
      }, 300);
      return;
    }

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
      ux_mode: 'popup',
      callback: async (response) => {
        if (response.error) {
          setError(`Google Auth Error: ${response.error_description || response.error}`);
          return;
        }

        if (response.code) {
          try {
            const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
            const payload = mode === 'signup' 
              ? { code: response.code, name: userNameInput }
              : { code: response.code };

            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
              localStorage.setItem('app_jwt', data.access_token);
              setAppJwt(data.access_token);
              setCurrentUser(data.user);
              showToast(`Welcome back, ${data.user.name}!`);
            } else {
              setError(data.detail || 'Authentication failed');
            }
          } catch (err) {
            setError('Server connection error during authentication');
          }
        }
      }
    });

    codeClient.requestCode();
  };

  // Handlers for Room Operations
  const handleCreateRoom = async (name, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ name, password })
      });
      if (res.ok) {
        const newRoom = await res.json();
        setMyRooms(prev => [...prev, newRoom]);
        setActiveRoomId(newRoom.id);
        setIsCreateJoinModalOpen(false);
        showToast(`Created room "${newRoom.name}"`);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to create room');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = async (roomId, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appJwt}`
        },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        await fetchMyRooms();
        setActiveRoomId(roomId);
        setIsCreateJoinModalOpen(false);
        showToast('Successfully joined room');
      } else {
        const err = await res.json();
        setError(err.detail || 'Invalid room ID or password');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler for Quota Allocation
  const handleAllocateStorage = async (allocatedBytes) => {
    if (!activeRoomId) return;
    const res = await fetch(`${BACKEND_URL}/rooms/${activeRoomId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appJwt}`
      },
      body: JSON.stringify({ allocated_bytes: allocatedBytes })
    });
    if (res.ok) {
      fetchRoomDashboard(activeRoomId);
      showToast('Storage quota updated');
    }
  };

  // Handlers for Directory Navigation
  const handleNavigateFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (crumb, idx) => {
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
  };

  // Handlers for File Actions
  const handleCreateFolder = async (folderName) => {
    const res = await fetch(`${BACKEND_URL}/files/room/${activeRoomId}/folder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appJwt}`
      },
      body: JSON.stringify({ name: folderName, parent_id: currentFolderId })
    });
    if (res.ok) {
      fetchDirectoryFiles();
      showToast(`Created folder "${folderName}"`);
    }
  };

  const handleDeleteFile = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/files/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${appJwt}` }
      });
      if (res.ok) {
        fetchDirectoryFiles();
        fetchRoomDashboard(activeRoomId);
        showToast(`Deleted ${item.is_folder ? 'folder' : 'file'} "${item.name}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadFile = (item) => {
    if (!item || item.is_folder) return;
    showToast(`Downloading "${item.name}"...`);
    fetch(`${BACKEND_URL}/files/${item.id}/download`, {
      headers: { Authorization: `Bearer ${appJwt}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error(err);
        showToast(`Failed to download "${item.name}"`);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('app_jwt');
    setAppJwt(null);
    setCurrentUser(null);
    setIsProfileModalOpen(false);
  };

  const handleOpenDeleteAccount = () => {
    setIsProfileModalOpen(false);
    setIsDeleteAccountModalOpen(true);
  };

  const handleAccountDeleted = (result) => {
    setIsDeleteAccountModalOpen(false);
    handleLogout();
    showToast(`Account successfully deleted (${result.migrated_files_count || 0} files migrated, ${result.cascaded_files_count || 0} files removed)`);
  };

  // If unauthenticated, render AuthScreen
  if (!appJwt) {
    return (
      <AuthScreen
        onGoogleAuth={handleGoogleAuth}
        userNameInput={userNameInput}
        setUserNameInput={setUserNameInput}
        error={error}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--emerald-primary)',
          borderRadius: '8px',
          padding: '10px 16px',
          color: 'var(--emerald-primary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          zIndex: 200
        }}>
          {toastMessage}
        </div>
      )}

      {/* Left Navigation Rail */}
      <NavigationRail
        rooms={myRooms}
        activeRoomId={activeRoomId}
        onSelectRoom={(id) => setActiveRoomId(id)}
        onOpenCreateJoinModal={() => setIsCreateJoinModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        currentUser={currentUser}
      />

      {/* Center Main Workspace */}
      <main className="main-workspace">
        <StorageHero
          activeRoom={activeRoom}
          storageData={storageData}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenAllocateModal={() => setIsAllocateModalOpen(true)}
        />

        <FileExplorer
          items={fileItems}
          breadcrumbs={breadcrumbs}
          onNavigateBreadcrumb={handleNavigateBreadcrumb}
          onNavigateFolder={handleNavigateFolder}
          onOpenNewFolderModal={() => setIsNewFolderModalOpen(true)}
          onOpenRenameModal={(item) => {
            setFileToRename(item);
            setIsRenameModalOpen(true);
          }}
          onOpenMoveModal={(item) => {
            setFileToMove(item);
            setIsMoveModalOpen(true);
          }}
          onOpenInfoDrawer={(item) => {
            setFileForInfo(item);
            setIsInfoDrawerOpen(true);
          }}
          onOpenPreview={(item) => {
            setFileToPreview(item);
            setIsPreviewModalOpen(true);
          }}
          onDownloadFile={handleDownloadFile}
          onDeleteFile={handleDeleteFile}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </main>

      {/* Right Member Sidebar */}
      <MemberSidebar
        members={roomMembers}
        roomOwnerId={activeRoom?.owner_id}
        currentUserId={currentUser?.id}
      />

      {/* Modals & Dialog System */}
      <CreateJoinRoomModal
        isOpen={isCreateJoinModalOpen}
        onClose={() => setIsCreateJoinModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        error={error}
      />

      <AllocateStorageModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        activeRoom={activeRoom}
        currentUser={currentUser}
        onAllocateStorage={handleAllocateStorage}
      />

      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        activeRoomId={activeRoomId}
        currentFolderId={currentFolderId}
        appJwt={appJwt}
        onUploadSuccess={() => {
          fetchDirectoryFiles();
          fetchRoomDashboard(activeRoomId);
          showToast('File uploaded successfully');
        }}
        BACKEND_URL={BACKEND_URL}
      />

      <MoveFileModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setFileToMove(null);
        }}
        fileToMove={fileToMove}
        activeRoomId={activeRoomId}
        appJwt={appJwt}
        onMoveSuccess={() => {
          fetchDirectoryFiles();
          showToast('Item moved successfully');
        }}
        BACKEND_URL={BACKEND_URL}
      />

      <RenameItemModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setFileToRename(null);
        }}
        fileItem={fileToRename}
        appJwt={appJwt}
        onRenameSuccess={(updatedItem) => {
          fetchDirectoryFiles();
          showToast(`Renamed to "${updatedItem.name}"`);
        }}
        BACKEND_URL={BACKEND_URL}
      />

      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setFileToPreview(null);
        }}
        file={fileToPreview}
        appJwt={appJwt}
        BACKEND_URL={BACKEND_URL}
      />

      <FileInfoDrawer
        isOpen={isInfoDrawerOpen}
        onClose={() => {
          setIsInfoDrawerOpen(false);
          setFileForInfo(null);
        }}
        file={fileForInfo}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onLogout={handleLogout}
        onDeleteAccount={handleOpenDeleteAccount}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        appJwt={appJwt}
        BACKEND_URL={BACKEND_URL}
        onAccountDeleted={handleAccountDeleted}
      />

      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
}
