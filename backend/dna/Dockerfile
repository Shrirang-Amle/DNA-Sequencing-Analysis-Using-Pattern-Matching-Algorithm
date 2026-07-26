# Use Eclipse Temurin JDK 17
FROM eclipse-temurin:17-jdk

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Give execute permission to Maven Wrapper
RUN chmod +x mvnw

# Build the application
RUN ./mvnw clean package -DskipTests

# Expose application port
EXPOSE 8080

# Run the Spring Boot application
CMD ["java", "-jar", "target/dna-0.0.1-SNAPSHOT.jar"]