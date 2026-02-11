package br.com.omega.payment_control.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/ping").permitAll()
                        .anyRequest().authenticated()
                )
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    @Bean
    InMemoryUserDetailsManager users() {
        UserDetails gerencia = User.withUsername("gerencia")
                .password("{noop}123")
                .roles("GERENCIA")
                .build();

        UserDetails diretoria = User.withUsername("diretoria")
                .password("{noop}123")
                .roles("DIRETORIA")
                .build();

        UserDetails rh = User.withUsername("rh")
                .password("{noop}123")
                .roles("RH")
                .build();

        UserDetails matriz = User.withUsername("matriz")
                .password("{noop}123")
                .roles("MATRIZ")
                .build();

        UserDetails sobral = User.withUsername("sobral")
                .password("{noop}123")
                .roles("SOBRAL")
                .build();

        UserDetails cariri = User.withUsername("cariri")
                .password("{noop}123")
                .roles("CARIRI")
                .build();

        return new InMemoryUserDetailsManager(gerencia, diretoria, rh, matriz, sobral, cariri);
    }
}
