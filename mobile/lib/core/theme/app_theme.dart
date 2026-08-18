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
  static const Color gold600 = Color(0xFFC98A16);

  // Form tones
  static const Color labelCream = Color(0xFFF6E9C8);
  static const Color helperText = Color(0xFFAFC7BA);
  static const Color inputText = Color(0xFF222222);
  static const Color errorText = Color(0xFFE25D5D);

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
  static const Color bg = g900;
  static const Color shell = g900;
  static const Color shellMuted = g800;
  static const Color cardGold = gold100;
  static const Color fieldSurface = Color(0xFFF8F5EE);

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
    final inputRadius = BorderRadius.circular(8);
    final inputBorder = OutlineInputBorder(
      borderRadius: inputRadius,
      borderSide: const BorderSide(color: gold600),
      gapPadding: 10,
    );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: shell,
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        foregroundColor: Colors.white,
        backgroundColor: shell,
        surfaceTintColor: shell,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: cardGold,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: gold500),
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
        filled: true,
        fillColor: fieldSurface,
        labelStyle: const TextStyle(color: inputText),
        floatingLabelStyle: const TextStyle(
          color: labelCream,
          fontWeight: FontWeight.w700,
          backgroundColor: shell,
        ),
        hintStyle: const TextStyle(color: ink500),
        helperStyle: const TextStyle(color: helperText),
        errorStyle: const TextStyle(
          color: errorText,
          fontWeight: FontWeight.w700,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        border: inputBorder,
        enabledBorder: inputBorder,
        focusedBorder: inputBorder.copyWith(
          borderSide: const BorderSide(color: gold500, width: 1.6),
        ),
        errorBorder: inputBorder.copyWith(
          borderSide: const BorderSide(color: errorText),
        ),
        focusedErrorBorder: inputBorder.copyWith(
          borderSide: const BorderSide(color: errorText, width: 1.6),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: g800),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        backgroundColor: g950,
        surfaceTintColor: g950,
        indicatorColor: gold500,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: ink900);
          }
          return const IconThemeData(color: g100);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            color: selected ? gold100 : g100,
            fontSize: 12,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          );
        }),
      ),
    );

    return base.copyWith(
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme),
    );
  }
}
