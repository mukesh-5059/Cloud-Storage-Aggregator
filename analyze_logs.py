import re
import os
from collections import Counter

LOG_FILE = "nginx/logs/access.log"

def analyze():
    if not os.path.exists(LOG_FILE):
        print(f"Log file '{LOG_FILE}' not found. Make sure Nginx is running and receiving traffic.")
        return

    endpoint_counter = Counter()
    status_counter = Counter()
    backend_counter = Counter()

    # Pattern matches log_format upstream_log
    # $remote_addr - [$time_local] "$request" status=$status upstream=$upstream_addr time=${request_time}s
    pattern = re.compile(r'"(?:GET|POST|PUT|DELETE|OPTIONS)\s+(\S+)\s+HTTP/[0-9.]+"\s+status=(\d+)\s+upstream=([^\s]+)')

    total_lines = 0
    with open(LOG_FILE, "r") as f:
        for line in f:
            total_lines += 1
            m = pattern.search(line)
            if m:
                endpoint, status, upstream = m.groups()
                endpoint_counter[endpoint] += 1
                status_counter[status] += 1
                backend_counter[upstream] += 1

    print("==================================================")
    print(f" NGINX ACCESS LOG ANALYSIS ({total_lines} total requests recorded)")
    print("==================================================")
    print("\n[+] Top Hit Endpoints (Rush Hour Peak):")
    for ep, count in endpoint_counter.most_common(5):
        pct = (count / total_lines) * 100 if total_lines else 0
        print(f"  {ep:<30} {count:>5} hits ({pct:.1f}%)")

    print("\n[+] HTTP Status Code Breakdown:")
    for st, count in status_counter.most_common():
        print(f"  Status {st:<10} {count:>5} requests")

    print("\n[+] Traffic Distribution Across Upstream Backends:")
    for bk, count in backend_counter.most_common():
        pct = (count / total_lines) * 100 if total_lines else 0
        print(f"  {bk:<30} {count:>5} requests ({pct:.1f}%)")
    print("==================================================")

if __name__ == "__main__":
    analyze()
