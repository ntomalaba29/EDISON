plugins {
    id("com.android.application")
}

android {
    namespace = "io.github.malaba29.edison.tv"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.malaba29.edison.tv"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}
