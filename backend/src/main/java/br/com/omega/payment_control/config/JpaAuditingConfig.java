package br.com.omega.payment_control.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider", dateTimeProviderRef = "fortalezaDateTimeProvider")
public class JpaAuditingConfig {

    private static final ZoneId FORTALEZA_ZONE = ZoneId.of("America/Fortaleza");

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return Optional.empty();
            }
            return Optional.ofNullable(auth.getName());
        };
    }

    @Bean
    public DateTimeProvider fortalezaDateTimeProvider() {
        return () -> Optional.of(LocalDateTime.now(FORTALEZA_ZONE));
    }
}
