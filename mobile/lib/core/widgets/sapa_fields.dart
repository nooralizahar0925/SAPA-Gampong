import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';

class SapaTextField extends StatelessWidget {
  const SapaTextField({
    super.key,
    required this.label,
    this.controller,
    this.hintText,
    this.helperText,
    this.validator,
    this.keyboardType,
    this.inputFormatters,
    this.textInputAction,
    this.textCapitalization = TextCapitalization.none,
    this.maxLines = 1,
    this.maxLength,
    this.counterText,
    this.readOnly = false,
    this.onTap,
    this.onChanged,
    this.onSubmitted,
    this.prefixIcon,
    this.suffixIcon,
    this.labelColor,
    this.helperColor,
  });

  final String label;
  final TextEditingController? controller;
  final String? hintText;
  final String? helperText;
  final FormFieldValidator<String>? validator;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputAction? textInputAction;
  final TextCapitalization textCapitalization;
  final int? maxLines;
  final int? maxLength;
  final String? counterText;
  final bool readOnly;
  final VoidCallback? onTap;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final Color? labelColor;
  final Color? helperColor;

  @override
  Widget build(BuildContext context) {
    return _SapaFieldShell(
      label: label,
      labelColor: labelColor,
      helperColor: helperColor,
      child: TextFormField(
        controller: controller,
        decoration: InputDecoration(
          hintText: hintText,
          helperText: helperText,
          counterText: counterText,
          prefixIcon: prefixIcon,
          suffixIcon: suffixIcon,
        ),
        style: const TextStyle(color: AppTheme.inputText),
        validator: validator,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        textInputAction: textInputAction,
        textCapitalization: textCapitalization,
        maxLines: maxLines,
        maxLength: maxLength,
        readOnly: readOnly,
        onTap: onTap,
        onChanged: onChanged,
        onFieldSubmitted: onSubmitted,
      ),
    );
  }
}

class SapaDropdownField extends StatelessWidget {
  const SapaDropdownField({
    super.key,
    required this.label,
    required this.items,
    required this.onChanged,
    this.value,
    this.validator,
    this.labelColor,
    this.helperColor,
  });

  final String label;
  final List<DropdownMenuItem<String>> items;
  final String? value;
  final ValueChanged<String?> onChanged;
  final FormFieldValidator<String>? validator;
  final Color? labelColor;
  final Color? helperColor;

  @override
  Widget build(BuildContext context) {
    return _SapaFieldShell(
      label: label,
      labelColor: labelColor,
      helperColor: helperColor,
      child: DropdownButtonFormField<String>(
        initialValue: value?.isEmpty == true ? null : value,
        decoration: const InputDecoration(),
        style: const TextStyle(color: AppTheme.inputText),
        items: items,
        onChanged: onChanged,
        validator: validator,
      ),
    );
  }
}

class SapaDisplayField extends StatelessWidget {
  const SapaDisplayField({
    super.key,
    required this.label,
    required this.value,
    this.helperText,
    this.labelColor,
    this.helperColor,
  });

  final String label;
  final String value;
  final String? helperText;
  final Color? labelColor;
  final Color? helperColor;

  @override
  Widget build(BuildContext context) {
    return _SapaFieldShell(
      label: label,
      labelColor: labelColor,
      helperColor: helperColor,
      child: InputDecorator(
        decoration: InputDecoration(helperText: helperText),
        child: Text(
          value,
          style: const TextStyle(
            color: AppTheme.inputText,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _SapaFieldShell extends StatelessWidget {
  const _SapaFieldShell({
    required this.label,
    required this.child,
    this.labelColor,
    this.helperColor,
  });

  final String label;
  final Widget child;
  final Color? labelColor;
  final Color? helperColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 2, bottom: 7),
          child: Text(
            label,
            style: TextStyle(
              color: labelColor ?? AppTheme.labelCream,
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        Theme(
          data: Theme.of(context).copyWith(
            inputDecorationTheme: Theme.of(context).inputDecorationTheme
                .copyWith(
                  helperStyle: TextStyle(
                    color: helperColor ?? AppTheme.helperText,
                    fontWeight: FontWeight.w600,
                  ),
                ),
          ),
          child: child,
        ),
      ],
    );
  }
}
