# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY backend/pom.xml .
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/analyzer-0.0.1-SNAPSHOT.jar app.jar

# Expose the port the app runs on
EXPOSE 8085

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
