import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { SelectionProvider } from './state';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <HashRouter>
      <SelectionProvider><App /></SelectionProvider>
    </HashRouter>
  </React.StrictMode>);
