import React from 'react';
import {createRoot} from 'react-dom/client';
import './theme.css';
import App from './App.jsx';

// The whole site is this React app. It talks to the Node/serverless API with
// relative URLs, so a dev server must proxy /api (see apps/web/vite.config.mjs).
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
