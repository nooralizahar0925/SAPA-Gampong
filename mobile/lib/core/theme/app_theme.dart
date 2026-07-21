import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  const AppTheme._();

  // Brand green — Hutan
  static const Color g50 = Color(0xFFEEF6F1);
  static const Color g100 = Color(0xFFDCEDE4);
  static const Color g200 = Color(0xFFC4E0D2);
  static const Color g300 = Color(0xFF8FCBAE);
  static const Color g400 = Color(0xFF4FB587);
  static const Color g500 = Color(0xFF27A472);
  static const Color g600 = Color(0xFF1E8A61);
  static const Color g700 = Color(0xFF176B4B);
  static const Color g800 = Color(0xFF124A34);
  static const Color g900 = Color(0xFF0E3B2A);
  static const Color g950 = Color(0xFF0A2A1E);

  // Gold accent — Padi
  static const Color gold100 = Color(0xFFF8ECCB);
  static const Color gold500 = Color(0xFFE0A82E);
  static const Color gold600 = Color(0xFFC68A1B);

  // Sky — Laôt
  static const Color sky100 = Color(0xFFDDEBF7);
  static const Color sky500 = Color(0xFF2E7CC0);

  // Ink
  static const Color ink900 = Color(0xFF131A17);
  static const Color ink700 = Color(0xFF37423C);
  static const Color ink500 = Color(0xFF667069);
  static const Color ink400 = Color(0xFF8A938D);
  static const Color ink300 = Color(0xFFB7BEB9);

  // Surfaces
  static const Color line = Color(0xFFE2E7E3);
  static const Color bg = Color(0xFFF4F7F5);

  // Status
  static const Color ok = Color(0xFF1E8A61);
  static const Color okBg = Color(0xFFD7EEE3);
  static const Color warn = Color(0xFFC68A1B);
  static const Color warnBg = Color(0xFFF8ECCB);
  static const Color danger = Color(0xFFC0392B);
  static const Color dangerBg = Color(0xFFF7DDD9);

  // Legacy aliases kept for backwards compat
  static const Color villageGreen = g800;
  static const Color deepGreen = g900;
  static const Color accentYellow = gold500;

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: g800,
      brightness: Brightness.light,
      primary: g800,
      secondary: gold500,
    );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: bg,
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        foregroundColor: ink900,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: line),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: g800,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          minimumSize: const Size.fromHeight(48),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: g800,
          side: const BorderSide(color: g800),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          minimumSize: const Size.fromHeight(48),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFD5DDD3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: g800, width: 1.4),
        ),
      ),
    );

    return base.copyWith(
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme),
    );
  }
}
