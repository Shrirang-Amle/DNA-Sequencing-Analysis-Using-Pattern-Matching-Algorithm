package com.example.dna.algorithms;

import java.util.*;

public class ApproxMatch {
    public static List<Integer> hamming(String text, String pattern) {
        List<Integer> res = new ArrayList<>();
        int m = pattern.length();
        for (int i = 0; i <= text.length() - m; i++) {
            int mismatch = 0;
            for (int j = 0; j < m; j++) {
                if (text.charAt(i + j) != pattern.charAt(j))
                    mismatch++;
            }
            if (mismatch <= 1)
                res.add(i);
        }
        return res;
    }
}