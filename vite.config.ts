import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  resolve: {
    // Ensure proper handling of dayjs CommonJS module
    dedupe: ['dayjs'],
  },
  build: {
    // Enable minification (default: true)
    minify: 'esbuild',
    // Source maps for production (optional, set to false for smaller builds)
    sourcemap: process.env.NODE_ENV !== 'production',
    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      // Tree-shaking configuration
      treeshake: {
        // Enable tree-shaking
        moduleSideEffects: (id) => {
          // Mark known side-effect-free modules
          const noSideEffects = [
            /node_modules\/@marsidev\/react-turnstile/,
            /node_modules\/mermaid/,
          ];
          
          // If it's a known side-effect-free module, return false
          if (noSideEffects.some(regex => regex.test(id))) {
            return false;
          }
          
          // Default: let Rollup analyze the module
          return null;
        },
        // Preserve class names for better tree-shaking
        preset: 'smallest',
        // Property read side effects
        propertyReadSideEffects: false,
        // Try-catch side effects
        tryCatchDeoptimization: false,
      },
      // Allow better tree-shaking by not preserving entry signatures
      preserveEntrySignatures: 'exports-only',
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          // Mermaid.js is large, split it into its own chunk
          'mermaid': ['mermaid'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Target modern browsers for smaller bundle size
    target: 'esnext',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // CommonJS options for better tree-shaking
    commonjsOptions: {
      // Transform CommonJS to ES modules for better tree-shaking
      transformMixedEsModules: true,
      // Strict require resolution
      strictRequires: true,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'dayjs',
      '@braintree/sanitize-url',
    ],
    exclude: ['mermaid'], // Exclude mermaid from pre-bundling (lazy loaded)
    esbuildOptions: {
      // Ensure CommonJS modules are treated properly
      mainFields: ['module', 'main'],
      // Tree-shaking optimizations for dependencies
      treeShaking: true,
      // Target modern ES features for better tree-shaking
      target: 'esnext',
    },
  },
  // Proxy API requests to Worker during development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
