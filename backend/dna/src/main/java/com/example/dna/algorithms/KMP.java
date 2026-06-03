package com.example.dna.algorithms;

import java.util.*;

public class KMP {

    static int[] lps(String p) {
        int[] lps = new int[p.length()];
        int j = 0;
        for (int i = 1; i < p.length(); i++) {
            while (j > 0 && p.charAt(i) != p.charAt(j))
                j = lps[j - 1];
            if (p.charAt(i) == p.charAt(j))
                lps[i] = ++j;
        }
        return lps;
    }

    public static List<Integer> search(String t, String p) {
        List<Integer> res = new ArrayList<>();
        int[] lps = lps(p);
        int i = 0, j = 0;
        while (i < t.length()) {
            if (t.charAt(i) == p.charAt(j)) {
                i++;
                j++;
            }
            if (j == p.length()) {
                res.add(i - j);
                j = lps[j - 1];
            } else if (i < t.length() && t.charAt(i) != p.charAt(j)) {
                if (j != 0)
                    j = lps[j - 1];
                else
                    i++;
            }
        }
        return res;
    }
}