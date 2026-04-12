import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ParseResultProvider } from './context/ParseResultContext';
import UploadPage from './pages/UploadPage';
import ProcessingPage from './pages/ProcessingPage';

function App() {
  return (
    <BrowserRouter>
      <ParseResultProvider>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/processing" element={<ProcessingPage />} />
        </Routes>
      </ParseResultProvider>
    </BrowserRouter>
  );
}

export default App;
