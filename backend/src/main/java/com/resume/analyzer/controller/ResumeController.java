package com.resume.analyzer.controller;

import com.resume.analyzer.service.PdfExtractorService;
import com.resume.analyzer.service.AiAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;

@CrossOrigin(origins = "*")
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

    /** Primary production endpoint: analyze the original PDF directly with Gemini. */
    @PostMapping(value = "/analyze-pdf", consumes = "multipart/form-data", produces = "application/json")
    public ResponseEntity<String> analyzePdf(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty() || !isPdfName(file)) {
            return ResponseEntity.badRequest()
                    .body("{\"error\":true,\"code\":\"INVALID_FILE\",\"message\":\"Please upload a valid PDF file.\"}");
        }
        try {
            String result = aiAnalysisService.analyzeResumePdf(file);
            return ResponseEntity.ok().header("Content-Type", "application/json").body(result);
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "Unknown error." : e.getMessage().replaceAll("\\s+", " ").trim();
            if (msg.length() > 300) msg = msg.substring(0, 300) + "...";
            String body = "{\"error\":true,\"code\":\"AI_ANALYSIS_FAILED\",\"message\":\""
                    + msg.replace("\\", "\\\\").replace("\"", "\\\"") + "\"}";
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).header("Content-Type", "application/json").body(body);
        }
    }

    private boolean isPdfName(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".pdf")) return false;
        String type = file.getContentType();
        return type == null || type.isBlank()
                || type.equalsIgnoreCase("application/pdf")
                || type.equalsIgnoreCase("application/octet-stream");
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
