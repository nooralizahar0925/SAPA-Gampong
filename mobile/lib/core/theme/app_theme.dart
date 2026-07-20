import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  static const Color villageGreen = Color(0xFF124A34);
  static const Color deepGreen = Color(0xFF0E3B2A);
  static const Color accentYellow = Color(0xFFE0A82E);

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: villageGreen,
      brightness: Brightness.light,
      primary: villageGreen,
      secondary: accentYellow,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF4F7F5),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        foregroundColor: Color(0xFF131A17),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Color(0xFFE2E8E1)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: villageGreen,
          foregroundColor: Colors.white,
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
          borderSide: const BorderSide(color: villageGreen, width: 1.4),
        ),
      ),
    );
  }
}
