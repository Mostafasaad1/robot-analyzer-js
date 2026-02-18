/**
 * Optimized Vite configuration for maximum performance
 * Features:
 * - Tree shaking
 * - Code splitting
 * - Brotli/Gzip compression
 * - Bundle analysis support
 * - CDN fallbacks
 * - Preloading strategies
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => ({
  plugins: [
    // Using SWC for faster React compilation
    react({
      fastRefresh: mode !== 'production',
    }),
    
    // Enable compression plugins
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files larger than 1KB
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    
    // Bundle analyzer (only in analyze mode)
    mode === 'analyze' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }) as any,
  ].filter(Boolean),
  
  build: {
    // Target modern browsers
    target: 'es2020',
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Minify options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
      },
      format: {
        comments: false,
      },
    },
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for advanced optimizations
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: (id) => {
          // Split React and related libs
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          
          // Split Three.js and 3D libraries
          if (id.includes('three') || id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
            return 'vendor-threejs';
          }
          
          // Split Zustand
          if (id.includes('zustand')) {
            return 'vendor-zustand';
          }
          
          // Split Axios
          if (id.includes('axios')) {
            return 'vendor-axios';
          }
          
          // Split URDF loader
          if (id.includes('urdf-loader')) {
            return 'vendor-urdf';
          }
          
          // Split UI libraries
          if (id.includes('node_modules/') && !id.includes('three') && !id.includes('react')) {
            return 'vendor-misc';
          }
        },
        
        // Asset naming with content hash for caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        
        // Inline small chunks
        inlineDynamicImports: false,
        
        // Preserve module syntax for tree shaking
        preserveModules: false,
      },
      
      // External dependencies (for CDN usage)
      external: [],
      
      // Resolve configuration
      resolve: {
        alias: {
          // Add any path aliases here
        },
      },
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'zustand',
        'axios',
      ],
      exclude: [
        'three',  // Keep three.js as external to optimize bundle size
        '@react-three/fiber',
        '@react-three/drei',
      ],
    },
    
    // Enable source maps for debugging
    sourcemap: mode === 'development' || mode === 'analyze',
  },
  
  // Server configuration for development
  server: {
    port: 3000,
    host: true,
    open: false,
    cors: true,
    hmr: {
      overlay: true,
    },
    // Proxy backend API
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    open: false,
  },
  
  // Define global constants
  define: {
    __DEV__: JSON.stringify(mode === 'development'),
    __PROD__: JSON.stringify(mode === 'production'),
  },
  
  // CSS preprocessing
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  
  // Worker configuration
  worker: {
    format: 'es',
  },
}));
