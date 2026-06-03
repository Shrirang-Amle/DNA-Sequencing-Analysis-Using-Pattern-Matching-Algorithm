package com.example.dna.controller;

import com.example.dna.service.DNAService;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DNAController {

    private final DNAService service;

    public DNAController(DNAService service) {
        this.service = service;
    }

    @GetMapping("/dataset")
    public Map<String, Object> datasetInfo() {
        return service.getDatasetInfo();
    }

    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody Map<String, String> input) {
        return service.analyze(
            input.get("dna"),
            input.get("pattern"),
            input.get("mode"),
            input.get("scanMode")
        );
    }
}
