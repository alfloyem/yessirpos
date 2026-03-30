import fs from 'fs';

const privateKeyBase64 = "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5YnpmcDdYamJCQVFoVkNWcC9DMm1YVlIzT3ZhN1FGckVBSHkvK2FMcWdEc0FBQkFBQUFBQUFBQUFBQUlBQUFBQWtVNUVVVzBzQTVoeUZsbmlxbFcwc1ZIcW5NZ0U2QVM3SHorK0RDYy9YOFlELzhWbmZndGNjM1NVOGwwQU9zYWVVTHMzc0VGTWZXY3JrS3QxNEo1Yk9JMXQxNnc2UGJFdEJZd1JiZ095VjRhcEJzcmhhK2oxMjNVQ05oaFdwU25MNE1EK0RCemNUK2s9Cg==";
const publicKeyBase64 = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDJFODY5QUIyQTkxMkE0NjkKUldScHBCS3BzcHFHTHV2dEdJZ2ZUZDFyZkJqcmtyUXk2THF6NHJlekdKS3ZrYXBDTnZZS1QyY1MK";

const decodedPrivate = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
const decodedPublic = Buffer.from(publicKeyBase64, 'base64').toString('utf8');

console.log('Decoded Private:\n', decodedPrivate);
console.log('Decoded Public:\n', decodedPublic);

fs.writeFileSync('c:/Users/Lenov/Videos/yessirpos/src-tauri/signing.key.fixed', decodedPrivate);
fs.writeFileSync('c:/Users/Lenov/Videos/yessirpos/src-tauri/signing.key.pub.fixed', decodedPublic);
