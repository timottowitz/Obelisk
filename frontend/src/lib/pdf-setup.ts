'use client';

import { pdfjs } from 'react-pdf';

// Configure the PDF.js worker from a CDN using the matching version
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Ensure text and annotation layers are styled
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; 