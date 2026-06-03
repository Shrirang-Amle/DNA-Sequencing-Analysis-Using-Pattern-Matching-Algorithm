package com.example.dna.utils;

public class Performance {
    public static long measure(Runnable r) {
        long s = System.nanoTime();
        r.run();
        return (System.nanoTime() - s) / 1000;
    }
}