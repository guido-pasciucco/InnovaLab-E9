# Agregar al final de android/app/proguard-rules.pro.
# Evita que R8 (minificación del build release) renombre o elimine las clases
# del módulo de protección, que Android y React Native buscan por nombre.
-keep class com.baprotege.protection.** { *; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; }
