import json
import requests
import sys
import csv
import os

api_key = os.getenv('FETCH_FOX_API_KEY')
# FetchFox API Config
host = 'https://fetchfox.ai'

def fetch_meal_data(menu_url, output_csv):
    """
    Fetch menu items and meal details from FetchFox API.
    """

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
                        "description": "What is the description of this meal? If there is no description available, try to generate an accurate description from the ingredients, meal name and the picture. If it's not possible, return NA.",
                        "ingredients": "What are the exact ingredients of this meal? Provide a structured CSV format with each ingredient as a separate field. If none, answer NA.",
                        "dietary_alignment": "Extract the dietary alignment as explicitly mentioned in the menu (symbols or item name). Use only these formats: V (Vegan), VG (Vegetarian), DF (Dairy-Free), KE (Keto), PA (Paleo). If not explicitly stated, return NA. Strictly No assumptions based on ingredients. If you're unsure or not completely sure, return NA",
                        "price": "What is the price of this meal? Include the currency (e.g., $12.99). It should only be a price, not text. If unavailable, answer NA.",
                        "meal_photos": "Some Menu cards have images along with the menu item. Extract those image URLs. If there are multiple images, Extract the best or first one, whichever is better. If unavailable, answer NA."
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
            print(json.dumps({"error": "No menu items found"}))
            return

        valid_meals = []
        for item in results['items']:
            meal_name = item.get("meal_name", "").strip()  # Remove extra spaces

            # Ensure meal_name is valid (not empty or "NA")
            if meal_name and meal_name.lower() != "na":
                valid_meals.append({
                    "meal_name": meal_name,
                    "description": item.get("description", "NA"),
                    "ingredients": item.get("ingredients", "NA"),
                    "dietary_alignment": item.get("dietary_alignment", "NA"),
                    "price": item.get("price", "NA"),
                    "meal_photos": (
                        ", ".join(item.get("meal_photos", ["NA"]))
                        if isinstance(item.get("meal_photos"), list)
                        else item.get("meal_photos", "NA")
                    )
                })

        # If no valid meals are found, return an error response
        if not valid_meals:
            print(json.dumps({"error": "No valid meals extracted"}))
            return

        # Save results to CSV
        with open(output_csv, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(["Meal Name", "Description", "Ingredients", "Dietary Alignment", "Price", "Meal Photos"])

            for meal in valid_meals:
                writer.writerow([
                    meal["meal_name"],
                    meal["description"],
                    meal["ingredients"],
                    meal["dietary_alignment"],
                    meal["price"],
                    meal["meal_photos"]
                ])

        # Print JSON response for Node.js to parse
        print(json.dumps(valid_meals, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python3 fetch_meal_data.py <menu_url> <output_csv>"}))
        sys.exit(1)

    menu_url = sys.argv[1]
    output_csv = sys.argv[2]

    fetch_meal_data(menu_url, output_csv)
