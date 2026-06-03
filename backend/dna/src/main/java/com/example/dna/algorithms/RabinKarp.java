package com.example.dna.algorithms;

import java.util.*;

public class RabinKarp {
    public static List<Integer> search(String text, String pattern) {
        List<Integer> res = new ArrayList<>();
        int d = 256, q = 101;
        int m = pattern.length();
        int p = 0, t = 0, h = 1;

        for (int i = 0; i < m - 1; i++)
            h = (h * d) % q;

        for (int i = 0; i < m; i++) {
            p = (d * p + pattern.charAt(i)) % q;
            t = (d * t + text.charAt(i)) % q;
        }

        for (int i = 0; i <= text.length() - m; i++) {
            if (p == t && text.substring(i, i + m).equals(pattern))
                res.add(i);

            if (i < text.length() - m) {
                t = (d * (t - text.charAt(i) * h) + text.charAt(i + m)) % q;
                if (t < 0)
                    t += q;
            }
        }
        return res;
    }
}
