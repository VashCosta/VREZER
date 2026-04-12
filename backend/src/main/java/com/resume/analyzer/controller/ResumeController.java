package com.resume.analyzer.controller;

import com.resume.analyzer.service.PdfExtractorService;
import com.resume.analyzer.service.AiAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/analyzer")
public class ResumeController {

    @Autowired
    private PdfExtractorService pdfExtractorService;

    @Autowired
    private AiAnalysisService aiAnalysisService;

    /**
     * Extracts raw text from the uploaded PDF.
     */
    @PostMapping("/extract")
    public ResponseEntity<String> extractResume(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !file.getOriginalFilename().endsWith(".pdf")) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"Please upload a valid PDF file.\"}");
        }

        try {
            String extractedText = pdfExtractorService.extractTextFromPdf(file);
            if (extractedText == null || extractedText.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body("{\"error\": \"No readable text found in this PDF.\"}");
            }

            String escaped = extractedText.replace("\\", "\\\\").replace("\"", "\\\"")
                    .replace("\r", "\\n").replace("\n", "\\n").replace("\t", "\\t");

            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body("{\"text\": \"" + escaped + "\"}");

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"Extraction failed: " + e.getMessage() + "\"}");
        }
    }

    /**
     * Performs AI analysis on the provided resume text using Gemini.
     */
    @PostMapping("/analyze")
    public ResponseEntity<String> analyzeResume(@RequestBody String text) {
        try {
            String analysisResult = aiAnalysisService.analyzeResume(text);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(analysisResult);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"AI Analysis failed: " + e.getMessage() + "\"}");
        }
    }
}
