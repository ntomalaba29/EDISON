import java.net.URI

plugins {
    id("com.android.application")
}

val edisonApiBaseUrl = providers.gradleProperty("edisonApiBaseUrl")
    .orElse("https://edison.ntomalaba29.workers.dev")
    .get()
val edisonApiUri = URI.create(edisonApiBaseUrl)
require(
    edisonApiUri.scheme == "https" &&
        edisonApiUri.host != null &&
        edisonApiUri.rawUserInfo == null &&
        edisonApiUri.rawQuery == null &&
        edisonApiUri.rawFragment == null &&
        (edisonApiUri.rawPath.isNullOrEmpty() || edisonApiUri.rawPath == "/")
) {
    "edisonApiBaseUrl must be an HTTPS origin without a path, query, or fragment."
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
        buildConfigField(
            "String",
            "EDISON_API_BASE_URL",
            "\"${edisonApiUri.toASCIIString().trimEnd('/')}\""
        )
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.zxing:core:3.5.3")
    testImplementation("junit:junit:4.13.2")
}
