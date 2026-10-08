import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Attempt to load from server root directory if running locally
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also fall back to cwd .env
dotenv.config();