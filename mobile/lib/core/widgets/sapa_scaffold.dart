import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../localization/strings_id.dart';
import '../router/app_router.dart';
import '../theme/app_theme.dart';

class SapaScaffold extends StatelessWidget {
  const SapaScaffold({
    super.key,
    required this.title,
    required this.body,
    this.subtitle,
    this.selectedIndex,
    this.actions,
    this.leading,
    this.padding = const EdgeInsets.all(16),
  });

  final String title;
  final String? subtitle;
  final Widget body;
  final int? selectedIndex;
  final List<Widget>? actions;
  final Widget? leading;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: leading,
        titleSpacing: leading == null ? 16 : 0,
        title: Row(
          children: [
            if (leading == null) ...[
              Image.asset('assets/images/logo.webp', height: 30, width: 30),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.g100,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: actions,
      ),
      body: SafeArea(
        child: Padding(padding: padding, child: body),
      ),
      bottomNavigationBar: selectedIndex == null
          ? null
          : NavigationBar(
              selectedIndex: selectedIndex!,
              onDestinationSelected: (index) {
                switch (index) {
                  case 0:
                    context.goNamed(AppRouteNames.home);
                  case 1:
                    context.goNamed(AppRouteNames.services);
                  case 2:
                    context.goNamed(AppRouteNames.news);
                  case 3:
                    context.goNamed(AppRouteNames.settings);
                }
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home),
                  label: StringsId.home,
                ),
                NavigationDestination(
                  icon: Icon(Icons.grid_view_outlined),
                  selectedIcon: Icon(Icons.grid_view),
                  label: StringsId.services,
                ),
                NavigationDestination(
                  icon: Icon(Icons.article_outlined),
                  selectedIcon: Icon(Icons.article),
                  label: StringsId.news,
                ),
                NavigationDestination(
                  icon: Icon(Icons.settings_outlined),
                  selectedIcon: Icon(Icons.settings),
                  label: StringsId.settings,
                ),
              ],
            ),
    );
  }
}

class SapaBackButton extends StatelessWidget {
  const SapaBackButton({
    super.key,
    this.fallbackRouteName = AppRouteNames.home,
  });

  final String fallbackRouteName;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Kembali',
      icon: const Icon(Icons.arrow_back),
      onPressed: () {
        if (context.canPop()) {
          context.pop();
          return;
        }

        context.goNamed(fallbackRouteName);
      },
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w800,
          color: Colors.white,
        ),
      ),
    );
  }
}

class SapaListTile extends StatelessWidget {
  const SapaListTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: onTap,
        minLeadingWidth: 42,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppTheme.gold500,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppTheme.ink900),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: AppTheme.ink700),
        ),
        trailing:
            trailing ??
            const Icon(Icons.chevron_right, color: AppTheme.ink500),
      ),
    );
  }
}
