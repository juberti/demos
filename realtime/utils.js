function getApiKey() {
  let apiKey = localStorage.getItem('openai-api-key');
  if (!apiKey) {
    apiKey = prompt('Please enter your OpenAI API key');
    if (apiKey) {
      localStorage.setItem('openai-api-key', apiKey);
    } 
  }
  return apiKey;
}
