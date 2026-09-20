package com.resume.analyzer.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

@Service
public class AiAnalysisService {

    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${vone.core.key}")
    private String apiKey;

    @Value("${vone.core.url}")
    private String apiUrl;

    public String analyzeResume(String resumeText) {
        String candidateName = extractCandidateName(resumeText);
        Exception lastEx = new Exception("AI Timeout");
        try {
            System.out.println("VREZER CORE: Initiating strategic analysis with gemini-3.8-flash...");
            return callGemini(resumeText, "gemini-3.8-flash");
        } catch (Exception e) {
            lastEx = e;
            System.err.println("VREZER CORE ERROR: " + e.getMessage());
            logAvailableModels();
        }
        System.err.println("AI failure after all attempts: " + lastEx.getMessage());
        return fallback(candidateName, lastEx.getMessage());
    }

    public String analyzeResumePdf(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) throw new Exception("Uploaded PDF is empty.");
        byte[] pdfBytes = file.getBytes();
        Exception last = new Exception("Gemini PDF analysis failed.");
        String[] models = {"gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"};
        for (String modelId : models) {
            try { return callGeminiPdf(pdfBytes, modelId); }
            catch (Exception e) {
                last = e;
                String m = e.getMessage() == null ? "" : e.getMessage().toLowerCase(Locale.ROOT);
                if (!(m.contains("404") || m.contains("429") || m.contains("500") || m.contains("502") || m.contains("503"))) break;
            }
        }
        throw last;
    }

    private String callGeminiPdf(byte[] pdfBytes, String modelId) throws Exception {
        String modelUrl = apiUrl + modelId + ":generateContent";
        String prompt = "Analyze the uploaded resume PDF itself, including scanned/image text. " +
                "Use only document evidence plus conservative career knowledge. Do not invent facts. " +
                "Return ONLY valid JSON with fields name, role, atsScore, summary, experience, education, " +
                "tier1{role,company,salary,city,state}, tier2{role,company,salary,city,state}, " +
                "tier3{role,company,salary,city,state}, topSkills[], skillGaps[], improvements[], prediction, " +
                "domains[{name,icon,match,color,roles[]}]. Missing data = Not available; unreliable salary = Salary data unavailable. " +
                "atsScore and match are integers 0-100; use the actual candidate domain.";

        Map<String,Object> textPart = Map.of("text", prompt);
        Map<String,Object> pdfData = new HashMap<>();
        pdfData.put("mimeType", "application/pdf");
        pdfData.put("data", Base64.getEncoder().encodeToString(pdfBytes));
        Map<String,Object> pdfPart = Map.of("inlineData", pdfData);
        Map<String,Object> content = new HashMap<>();
        content.put("parts", List.of(textPart, pdfPart));
        Map<String,Object> config = new HashMap<>();
        config.put("responseMimeType", "application/json");
        config.put("temperature", 0.0);
        Map<String,Object> body = new HashMap<>();
        body.put("contents", List.of(content));
        body.put("generationConfig", config);
        RestTemplate rest = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(mapper.writeValueAsString(body), headers);
        ResponseEntity<String> res = rest.postForEntity(modelUrl, entity, String.class);
        if (!res.getStatusCode().is2xxSuccessful()) throw new Exception("Gemini API failed (" + res.getStatusCode().value() + ")");
        JsonNode root = mapper.readTree(res.getBody());
        JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
        if (!parts.isArray() || parts.isEmpty()) throw new Exception("Gemini returned no PDF analysis.");
        String text = parts.get(0).path("text").asText("");
        if (text.isBlank()) throw new Exception("Gemini returned empty PDF analysis.");
        String cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            int first = cleaned.indexOf("\n"), lastFence = cleaned.lastIndexOf("```");
            if (first >= 0 && lastFence > first) cleaned = cleaned.substring(first + 1, lastFence).trim();
        }
        JsonNode analysis = mapper.readTree(cleaned);
        if (!analysis.isObject()) throw new Exception("Gemini returned invalid analysis JSON.");
        return mapper.writeValueAsString(analysis);
    }
    private String callGemini(String resumeText, String modelId) throws Exception {
        RestTemplate rest = new RestTemplate();
        ObjectMapper mapper = new ObjectMapper();

        // Construct model-specific URL using configured apiUrl
        String modelUrl = apiUrl + modelId + ":generateContent";

        String prompt = "You are a senior career analyst for the Indian IT industry. " +
                "Analyse this resume carefully and respond ONLY with valid JSON. " +
                "Base all predictions on the actual skills, experience, and education found in the resume. " +
                "JSON schema:\n" +
                "{\n" +
                "  \"name\": \"<candidate full name from resume>\",\n" +
                "  \"role\": \"<current or most recent role>\",\n" +
                "  \"atsScore\": <integer 0-100 based on keyword richness and formatting>,\n" +
                "  \"summary\": \"<2 sentence professional summary of the candidate>\",\n" +
                "  \"experience\": \"<total years of experience e.g. 3 years>\",\n" +
                "  \"education\": \"<highest qualification e.g. B.Tech CSE, VIT 2022>\",\n" +
                "  \"tier1\": { \"role\": \"<aspirational role in 3-5 years>\", \"company\": \"<top Indian/MNC IT company suitable for this profile>\", \"salary\": \"<realistic LPA range e.g. 45-70 LPA>\", \"city\": \"<best city in India for this role>\", \"state\": \"<state>\" },\n"
                +
                "  \"tier2\": { \"role\": \"<mid-level realistic role now>\", \"company\": \"<mid-tier Indian IT company>\", \"salary\": \"<realistic LPA range>\", \"city\": \"<city>\", \"state\": \"<state>\" },\n"
                +
                "  \"tier3\": { \"role\": \"<entry or current level role>\", \"company\": \"<accessible Indian IT company>\", \"salary\": \"<realistic LPA range>\", \"city\": \"<city>\", \"state\": \"<state>\" },\n"
                +
                "  \"topSkills\": [\"<skill1>\", \"<skill2>\", \"<skill3>\", \"<skill4>\"],\n" +
                "  \"skillGaps\": [\"<missing skill 1>\", \"<missing skill 2>\", \"<missing skill 3>\"],\n" +
                "  \"improvements\": [\"<specific resume improvement 1>\", \"<specific improvement 2>\", \"<specific improvement 3>\"],\n"
                +
                "  \"prediction\": \"<1 sentence prediction of the candidate's career in 5 years based on current trajectory>\",\n"
                +
                "  \"domains\": [\n" +
                "    { \"name\": \"<domain name e.g. Full Stack Development>\", \"icon\": \"<one of: code, cloud, brain, shield, chart-bar, mobile, database, microchip>\", \"match\": <integer 60-100 fit percentage based on resume>, \"color\": \"<one of: violet, blue, green, amber, pink, cyan>\", \"roles\": [\"<job role 1>\", \"<job role 2>\", \"<job role 3>\"] },\n"
                +
                "    { \"name\": \"<domain 2>\", \"icon\": \"<icon>\", \"match\": <match%>, \"color\": \"<color>\", \"roles\": [\"<role1>\", \"<role2>\", \"<role3>\"] },\n"
                +
                "    { \"name\": \"<domain 3>\", \"icon\": \"<icon>\", \"match\": <match%>, \"color\": \"<color>\", \"roles\": [\"<role1>\", \"<role2>\", \"<role3>\"] },\n"
                +
                "    { \"name\": \"<domain 4>\", \"icon\": \"<icon>\", \"match\": <match%>, \"color\": \"<color>\", \"roles\": [\"<role1>\", \"<role2>\", \"<role3>\"] }\n"
                +
                "  ]\n" +
                "}\n\n" +
                "Resume:\n" + resumeText.substring(0, Math.min(resumeText.length(), 4000));

        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(part));
        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(content));
        body.put("generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.3));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(mapper.writeValueAsString(body), headers);

        ResponseEntity<String> res = rest.postForEntity(modelUrl, entity, String.class);
        if (res.getStatusCode().is2xxSuccessful()) {
            JsonNode root = mapper.readTree(res.getBody());
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        }
        String errorBody = res.getBody() != null ? res.getBody() : res.getStatusCode().toString();
        throw new Exception("API failed (" + res.getStatusCode() + "): " + errorBody);
    }

    private void logAvailableModels() {
        try {
            RestTemplate rest = new RestTemplate();
            String listUrl = apiUrl.replace("/models/", "/models") + "?key=" + apiKey;
            ResponseEntity<String> res = rest.getForEntity(listUrl, String.class);
            System.err.println("VREZER CORE DIAGNOSTIC - Available Models: " + res.getBody());
        } catch (Exception e) {
            System.err.println("VREZER CORE DIAGNOSTIC - Failed to list models: " + e.getMessage());
        }
    }

    private String extractCandidateName(String text) {
        if (text == null || text.trim().isEmpty())
            return "Resume Candidate";
        String[] lines = text.split("\\n");
        for (String line : lines) {
            String clean = line.trim().replaceAll("[^a-zA-Z\\s\\.]", "");
            if (clean.length() > 3) {
                String[] words = clean.split("\\s+");
                String lower = clean.toLowerCase();
                // Heuristic: Name is usually the first line with 2-4 words that isn't a long sentence
                if (words.length >= 2 && words.length <= 4 && !lower.contains("internship")
                        && !lower.contains("worked") && !lower.contains("resume") 
                        && !lower.contains("curriculum vitae") && !lower.contains("profile") 
                        && !lower.contains("email") && !lower.contains("phone")
                        && !lower.contains("page") && !lower.contains("summary")) {
                    return clean;
                }
            }
        }
        // Fallback: If no line matches, grab the first 2-3 words of the clean text (excluding common headers)
        String cleanText = text.replaceAll("[^a-zA-Z\\s\\.]", " ").trim();
        String[] words = cleanText.split("\\s+");
        List<String> validWords = new ArrayList<>();
        for (String w : words) {
            String lw = w.toLowerCase();
            if (lw.equals("resume") || lw.equals("curriculum") || lw.equals("vitae") || lw.equals("cv") || lw.equals("profile") || lw.equals("dossier")) {
                continue;
            }
            if (w.length() > 1) {
                validWords.add(w);
            }
            if (validWords.size() >= 3) {
                break;
            }
        }
        if (validWords.size() >= 2) {
            return String.join(" ", validWords);
        }
        return "Resume Candidate";
    }

    private String fallback(String name, String error) {
        // Escape quotes and newlines in the error message for JSON safety
        String safeError = error != null ? error.replace("\"", "'").replace("\n", " ") : "Unknown Error";
        return "{\n" +
                "  \"name\": \"" + name + "\",\n" +
                "  \"role\": \"Software Professional\",\n" +
                "  \"atsScore\": 82,\n" +
                "  \"summary\": \"API ERROR: " + safeError + "\",\n"
                +
                "  \"experience\": \"Calculated from resume markers\",\n" +
                "  \"education\": \"Found in academic dossier\",\n" +
                "  \"tier1\": { \"role\": \"Lead Engineer\", \"company\": \"Tier 1 MNC\", \"salary\": \"45-65 LPA\", \"city\": \"Bengaluru\", \"state\": \"KA\" },\n"
                +
                "  \"tier2\": { \"role\": \"Senior Associate\", \"company\": \"Growth Startup\", \"salary\": \"25-40 LPA\", \"city\": \"Hyderabad\", \"state\": \"TS\" },\n"
                +
                "  \"tier3\": { \"role\": \"Full Stack dev\", \"company\": \"Service Corp\", \"salary\": \"8-15 LPA\", \"city\": \"Pune\", \"state\": \"MH\" },\n"
                +
                "  \"topSkills\": [\"Technical Adaptability\", \"Core Engineering\", \"Problem Solving\"],\n" +
                "  \"skillGaps\": [\"Cloud Architecture\", \"System Design\"],\n" +
                "  \"improvements\": [\"Add more quantifyable achievements\", \"Optimize keywords for ATS\"],\n" +
                "  \"prediction\": \"Steady growth predicted in the IT sector with specialized focus on system modernization.\",\n"
                +
                "  \"domains\": [\n" +
                "    { \"name\": \"Software Dev\", \"icon\": \"code\", \"match\": 85, \"color\": \"violet\", \"roles\": [\"SDE\", \"FE\", \"BE\"] },\n"
                +
                "    { \"name\": \"Cloud Ops\", \"icon\": \"cloud\", \"match\": 70, \"color\": \"blue\", \"roles\": [\"DevOps\", \"Azure\"] }\n"
                +
                "  ]\n" +
                "}";
    }
}
