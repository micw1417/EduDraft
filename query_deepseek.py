import requests

def query_deepseek(prompt, api_key):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Context for the AI
    payload = {
        "model": "deepseek/deepseek-chat-v3.1:free",
        "messages": [
            {
                "role": "system",
                "content": "You are a teacher who loves helping students learn anything they desire."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()  # Raise exception for HTTP errors
        result = response.json()
    except requests.exceptions.RequestException as e:
        print(f" Request failed: {e}")
        return None
    except ValueError:
        print(" Response is not valid JSON:", response.text)
        return None

    # Check if the response has the expected structure
    if "choices" not in result or not result["choices"]:
        print(" API response does not contain 'choices':", result)
        return None

    try:
        content = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        print(" Unexpected response format:", e, result)
        return None

    return content
