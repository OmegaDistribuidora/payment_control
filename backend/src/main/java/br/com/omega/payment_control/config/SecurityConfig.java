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
        UserDetails gerencia = User.withUsername("admin")
                .password("{noop}Omega@123")
                .roles("GERENCIA")
                .build();

        UserDetails diretoria = User.withUsername("diretoria")
                .password("{noop}Diretoria@123")
                .roles("DIRETORIA")
                .build();

        UserDetails rh = User.withUsername("rh")
                .password("{noop}Carlos@123")
                .roles("RH")
                .build();

        UserDetails matriz = User.withUsername("omega.matriz")
                .password("{noop}Matriz@123")
                .roles("MATRIZ")
                .build();

        UserDetails sobral = User.withUsername("omega.sobral")
                .password("{noop}Sobral@123")
                .roles("SOBRAL")
                .build();

        UserDetails cariri = User.withUsername("omega.cariri")
                .password("{noop}Cariri@123")
                .roles("CARIRI")
                .build();

        return new InMemoryUserDetailsManager(gerencia, diretoria, rh, matriz, sobral, cariri);
    }
}
