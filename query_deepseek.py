import requests
import time

def query_deepseek(prompt, api_key, retries=3, backoff=2):
    """
    Query the DeepSeek API safely with optional retry logic.

    Args:
        prompt (str): The prompt to send.
        api_key (str): Your OpenRouter API key.
        retries (int): Number of times to retry on failure.
        backoff (int): Seconds to wait between retries, multiplied each time.

    Returns:
        str: The content from the API or an error message.
    """
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek/deepseek-chat-v3.1:free",
        "messages": [
            {"role": "system",
             "content": "You are a teacher who loves helping students learn anything they want."},
            {"role": "user", "content": prompt}
        ]
    }

    for attempt in range(1, retries + 1):
        try:
            response = requests.post(url, headers=headers, json=payload)
            result = response.json()
        except Exception as e:
            return f"Error parsing JSON response: {e}"

        if "choices" in result:
            return result["choices"][0]["message"]["content"]
        else:
            error_info = result.get("error", result)
            # If rate-limited, wait and retry
            if isinstance(error_info, dict) and error_info.get("code") == 429 and attempt < retries:
                wait_time = backoff ** attempt
                print(f"Rate limited, retrying in {wait_time} seconds (Attempt {attempt}/{retries})...")
                time.sleep(wait_time)
            else:
                return f"Error: 'choices' not in response. Full response: {result}"

    return f"Failed after {retries} retries. Last response: {result}"
