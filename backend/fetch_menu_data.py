import json
import requests
import sys

# FetchFox API Config
host = 'https://fetchfox.ai'
api_key = 'ff_w31dsehgv10b3vzygud4zh8zp9de5qqtl50cv7yl'

def fetch_menu_data(vendor_id, menu_url):
    """
    Fetch menu data from FetchFox API and return JSON (without storing in DB).
    """

    # FetchFox Workflow
    workflow = {
        "steps": [
            {
                "name": "const",
                "args": {
                    "items": [{"url": menu_url}],
                    "maxPages": 1
                }
            },
            {
                "name": "extract",
                "args": {
                    "questions": {
                        "meal_name": "What is the name of this meal? If unavailable, answer NA.",
                        "description": "What is the description of this meal? If unavailable, answer NA.",
                        "ingredients": "What are the ingredients of this meal? If unavailable, answer NA.",
                        "dietary_alignment": "What is the dietary alignment of this meal? If none, answer NA.",
                        "price": "What is the price of this meal? If unavailable, answer NA.",
                        "vendor_name": "What is the name of the vendor? If unavailable, answer NA.",
                        "website": "What is the website URL? If unavailable, answer NA.",
                        "instagram": "What is the Instagram URL? If unavailable, answer NA.",
                        "google_maps": "What is the Google Maps URL? If unavailable, answer NA.",
                        "third_party_review_links": "What are the third-party review links? If none, answer NA.",
                        "vendor_description": "What is the description of the vendor? If unavailable, answer NA.",
                        "meal_photos": "What are the image URLs for the meal photos? If unavailable, answer NA.",
                        "vendor_logo": "What is the URL for the vendor's logo? If unavailable, answer NA.",
                        "url": "What is the URL? If unavailable, answer NA."
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
        workflow_resp = requests.post(f"{host}/api/v2/workflows", headers=headers, json=workflow)
        workflow_data = workflow_resp.json()
        workflow_id = workflow_data.get('id')

        run_resp = requests.post(f"{host}/api/v2/workflows/{workflow_id}/run", headers=headers, json={})
        job_id = run_resp.json().get('jobId')

        results = None
        while True:
            job_resp = requests.get(f"{host}/api/v2/jobs/{job_id}", headers=headers)
            job_data = job_resp.json()
            results = job_data.get('results')

            if job_data.get('done'):
                break

        if not results or 'items' not in results:
            print(json.dumps({"error": "No menu items found"}))
            return

        print(json.dumps(results['items'], indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python3 fetch_menu_data.py <vendor_id> <menu_url>"}))
        sys.exit(1)

    vendor_id = sys.argv[1]
    menu_url = sys.argv[2]
    fetch_menu_data(vendor_id, menu_url)
