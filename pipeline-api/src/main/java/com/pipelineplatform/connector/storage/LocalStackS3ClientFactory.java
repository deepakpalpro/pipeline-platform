package com.pipelineplatform.connector.storage;

import java.net.URI;
import java.util.Map;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

/**
 * Builds an S3 client pointed at LocalStack (or real AWS when endpoint is omitted). Shared by
 * StorageConnector and future MessageBus helpers.
 */
public final class LocalStackS3ClientFactory {

  public static final String DEFAULT_ENDPOINT = "http://localhost:4567";
  public static final String DEFAULT_REGION = "us-east-1";
  public static final String DEFAULT_ACCESS_KEY = "test";
  public static final String DEFAULT_SECRET_KEY = "test";

  private LocalStackS3ClientFactory() {}

  public static S3Client create(Map<String, Object> properties, Map<String, String> secrets) {
    String endpoint = stringProp(properties, "endpoint", envOr("LOCALSTACK_ENDPOINT", DEFAULT_ENDPOINT));
    String region = stringProp(properties, "region", DEFAULT_REGION);
    String accessKey =
        firstNonBlank(
            secrets.get("accessKeyId"),
            stringProp(properties, "accessKeyId", null),
            DEFAULT_ACCESS_KEY);
    String secretKey =
        firstNonBlank(
            secrets.get("secretAccessKey"),
            stringProp(properties, "secretAccessKey", null),
            DEFAULT_SECRET_KEY);

    return S3Client.builder()
        .endpointOverride(URI.create(endpoint))
        .region(Region.of(region))
        .credentialsProvider(
            StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
        .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
        .build();
  }

  private static String envOr(String name, String defaultValue) {
    String value = System.getenv(name);
    return value == null || value.isBlank() ? defaultValue : value;
  }

  private static String stringProp(Map<String, Object> properties, String key, String defaultValue) {
    Object value = properties == null ? null : properties.get(key);
    if (value == null || value.toString().isBlank()) {
      return defaultValue;
    }
    return value.toString();
  }

  private static String firstNonBlank(String... values) {
    if (values == null) {
      return null;
    }
    for (String value : values) {
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return null;
  }
}
