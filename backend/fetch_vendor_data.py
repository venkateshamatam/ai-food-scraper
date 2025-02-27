import json
import requests
import sys
import os

# FetchFox API Config
api_key = os.getenv('FETCH_FOX_API_KEY')
host = 'https://fetchfox.ai'

def fetch_vendor_data(vendor_url):
    """
    Fetch vendor metadata from FetchFox API and return JSON with structured third-party review links.
    """

    workflow = {
        "steps": [
            {
                "name": "const",
                "args": {
                    "items": [{"url": vendor_url}],
                    "maxPages": 1
                }
            },
            {
                "name": "extract",
                "args": {
                    "questions": {
                        "vendor_name": "What is the name of the vendor? If unavailable, answer NA.",
                        "website": "What is the website URL? If unavailable, answer NA.",
                        "instagram": "What is the Instagram URL? If unavailable, answer NA.",
                        "google_maps": "What is the Google Maps URL? If unavailable, answer NA.",
                        "infatuation_link": "What is the Infatuation review URL? If unavailable, answer NA.",
                        "eater_link": "What is the Eater review URL? If unavailable, answer NA.",
                        "vendor_description": "Generate a high-quality description of the vendor's webpage, ingredients or any other relevant data. If unavailable, answer NA.",
                        "vendor_logo": "What is the URL for the vendor's logo? If unavailable, answer NA."
                    },
                    "mode": "multiple",
                    "view": "html",
                    "maxPages": "1000"
                }
            }
        ],
        "options": {
            "limit": None
        }
    }

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }

    try:
        # Create workflow
        workflow_resp = requests.post(f"{host}/api/v2/workflows", headers=headers, json=workflow)
        workflow_data = workflow_resp.json()
        workflow_id = workflow_data.get('id')

        run_resp = requests.post(f"{host}/api/v2/workflows/{workflow_id}/run", headers=headers, json={})
        job_id = run_resp.json().get('jobId')

        # Poll for results
        results = None
        while True:
            job_resp = requests.get(f"{host}/api/v2/jobs/{job_id}", headers=headers)
            job_data = job_resp.json()
            results = job_data.get('results')

            if job_data.get('done'):
                break

        # Ensure results exist
        if not results or 'items' not in results:
            print(json.dumps({"error": "No vendor metadata found"}))
            return

        # Structure the data properly
        structured_results = []
        for item in results['items']:
            structured_results.append({
                "vendor_name": item.get("vendor_name", "NA"),
                "website": item.get("website", "NA"),
                "instagram": item.get("instagram", "NA"),
                "google_maps": item.get("google_maps", "NA"),
                "vendor_description": item.get("vendor_description", "NA"),
                "vendor_logo": item.get("vendor_logo", "NA"),
                "review_links": {
                    "infatuation": item.get("infatuation_link", "NA"),
                    "eater": item.get("eater_link", "NA")
                }
            })

        # Print structured JSON
        print(json.dumps(structured_results, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python3 fetch_vendor_data.py <vendor_url>"}))
        sys.exit(1)

    vendor_url = sys.argv[1]
    fetch_vendor_data(vendor_url)
