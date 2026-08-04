plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.jobbingtrack_mobile"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.jobbingtrack_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

// Contourne compressDebugAssets / Zip « already contains entry … kernel_blob.bin »
// (intermédiaires sales après clean partiel, Docker /workspace root-owned, rebuild parallèle).
tasks.configureEach {
    if (name.startsWith("compress") && name.contains("Assets", ignoreCase = true)) {
        doFirst {
            val compressedRoot =
                layout.buildDirectory.get().asFile.resolve("intermediates/compressed_assets")
            if (compressedRoot.exists()) {
                compressedRoot.deleteRecursively()
            }
            // Ancien jar résiduel hors arborescence compressée
            layout.buildDirectory.get().asFile.walkTopDown()
                .filter { it.isFile && it.name.contains("kernel_blob") }
                .forEach { it.delete() }
        }
    }
}
