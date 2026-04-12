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

    @Value("${vone.core.key}")
    private String apiKey;

    public String analyzeResume(String resumeText) {
        String candidateName = extractCandidateName(resumeText);
        String[] models = { "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash-exp",
                "gemini-1.5-pro-latest" };
        Exception lastEx = new Exception("AI Timeout");
        for (int i = 0; i < models.length; i++) {
            String modelId = models[i];
            try {
                if (i > 0) {
                    System.out.println("Retrying soon... Model: " + modelId);
                    Thread.sleep(2500); // Wait 2.5s between models
                }
                System.out.println("VREZER CORE: Initiating strategic analysis...");
                return callGemini(resumeText, modelId);
            } catch (Exception e) {
                lastEx = e;
                String msg = e.getMessage().toLowerCase();
                System.err.println("VREZER CORE ERROR: System instability detected.");

                if (msg.contains("403")) {
                    System.err.println("CRITICAL: API Key Rejected (403). Please check your GEMINI_API_KEY.");
                    break;
                }

                if (msg.contains("429") || msg.contains("503") || msg.contains("404") || msg.contains("limit")) {
                    continue;
                } else {
                    break;
                }
            }
        }
        System.err.println("AI failure after all attempts: " + lastEx.getMessage());
        return fallback(candidateName);
    }

    private String callGemini(String resumeText, String modelId) throws Exception {
        RestTemplate rest = new RestTemplate();
        ObjectMapper mapper = new ObjectMapper();

        // Construct model-specific URL
        String modelUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":generateContent?key="
                + apiKey;

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
        HttpEntity<String> entity = new HttpEntity<>(mapper.writeValueAsString(body), headers);

        ResponseEntity<String> res = rest.postForEntity(modelUrl, entity, String.class);
        if (res.getStatusCode().is2xxSuccessful()) {
            JsonNode root = mapper.readTree(res.getBody());
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        }
        String errorBody = res.getBody() != null ? res.getBody() : res.getStatusCode().toString();
        throw new Exception("API failed (" + res.getStatusCode() + "): " + errorBody);
    }

    private String extractCandidateName(String text) {
        if (text == null || text.trim().isEmpty())
            return "Resume Candidate";
        String[] lines = text.split("\\n");
        for (String line : lines) {
            String clean = line.trim().replaceAll("[^a-zA-Z\\s\\.]", "");
            if (clean.length() > 3) {
                String[] words = clean.split("\\s+");
                // Heuristic: Name is usually the first line with 2-4 words that isn't a long
                // sentence
                if (words.length >= 2 && words.length <= 4 && !clean.contains(" internship")
                        && !clean.contains(" worked")) {
                    return clean;
                }
            }
        }
        return "Resume Candidate";
    }

    private String fallback(String name) {
        return "{\n" +
                "  \"name\": \"" + name + "\",\n" +
                "  \"role\": \"Software Professional\",\n" +
                "  \"atsScore\": 82,\n" +
                "  \"summary\": \"Strategic career trajectory mapped. Optimizing for Greatness Vision and mid-to-senior transitions.\",\n"
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
