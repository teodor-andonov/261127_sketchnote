import {defineConfig} from 'vite';
export default defineConfig({base:'./',worker:{format:'es'},optimizeDeps:{exclude:['@jsquash/webp']},build:{target:'es2022'}});