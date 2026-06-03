package com.example.dna.algorithms;

import java.util.*;

public class Naive {
    public static List<Integer> search(String text, String pattern) {
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i <= text.length() - pattern.length(); i++) {
            if (text.substring(i, i + pattern.length()).equals(pattern)) {
                res.add(i);
            }
        }
        return res;
    }
}