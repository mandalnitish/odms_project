import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/odms_project/', // Match your repository name
  plugins: [react()],
});
