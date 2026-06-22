async function _postExample(name: string): Promise<void> {
  const data = { name };
  await fetch('/example/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
