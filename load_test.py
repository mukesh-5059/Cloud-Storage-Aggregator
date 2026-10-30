import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

URL = "http://localhost:8080/healthz"
TOTAL_REQUESTS = 1000
CONCURRENCY = 20

def send_request(idx):
    start = time.perf_counter()
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "LoadTester/1.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            elapsed = (time.perf_counter() - start) * 1000
            backend = resp.headers.get("X-Backend-Server", "unknown")
            return resp.status == 200, elapsed, backend, resp.status
    except urllib.error.HTTPError as e:
        elapsed = (time.perf_counter() - start) * 1000
        return False, elapsed, "error", e.code
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return False, elapsed, "error", 502

def run_benchmark(total_requests=TOTAL_REQUESTS, concurrency=CONCURRENCY):
    print(f"\n=======================================================")
    print(f" Starting Benchmark: {total_requests} requests (Concurrency: {concurrency})")
    print(f" Target: {URL}")
    print(f"=======================================================")

    success_count = 0
    fail_count = 0
    latencies = []
    backend_counts = {}

    start_total = time.perf_counter()
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(send_request, i) for i in range(total_requests)]
        for f in as_completed(futures):
            ok, lat, backend, status = f.result()
            latencies.append(lat)
            backend_counts[backend] = backend_counts.get(backend, 0) + 1
            if ok:
                success_count += 1
            else:
                fail_count += 1

    total_time = time.perf_counter() - start_total
    rps = total_requests / total_time
    avg_latency = sum(latencies) / len(latencies)
    latencies.sort()
    p95_latency = latencies[int(len(latencies) * 0.95)]

    print(f"\n--- Benchmark Results ---")
    print(f"Total Requests:       {total_requests}")
    print(f"Successful (200 OK):  {success_count}")
    print(f"Failed Requests:      {fail_count}")
    print(f"Total Time Taken:     {total_time:.2f} s")
    print(f"Requests per Second:  {rps:.2f} req/s")
    print(f"Average Response Time:{avg_latency:.2f} ms")
    print(f"95th Percentile:      {p95_latency:.2f} ms")
    print(f"\n--- Request Distribution by Backend ---")
    for b, count in sorted(backend_counts.items()):
        print(f"  {b}: {count} requests ({(count/total_requests)*100:.1f}%)")
    print(f"=======================================================\n")

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else TOTAL_REQUESTS
    conc = int(sys.argv[2]) if len(sys.argv) > 2 else CONCURRENCY
    if len(sys.argv) > 3:
        URL = sys.argv[3]
    run_benchmark(count, conc)
