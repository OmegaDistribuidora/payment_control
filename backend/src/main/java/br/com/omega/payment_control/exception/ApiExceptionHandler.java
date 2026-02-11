package br.com.omega.payment_control.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        logger.warn("Request error: status={} path={} message={}", ex.getStatusCode().value(), request.getRequestURI(), ex.getReason());
        Map<String, Object> body = baseBody(ex.getStatusCode().value(), ex.getStatusCode().toString(), ex.getReason(), request);
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, Object> fields = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fields.put(e.getField(), e.getDefaultMessage()));

        logger.warn("Validation error: path={} fields={}", request.getRequestURI(), fields);
        Map<String, Object> body = baseBody(HttpStatus.BAD_REQUEST.value(), "BAD_REQUEST", "Erro de validação", request);
        body.put("fields", fields);

        return ResponseEntity.badRequest().body(body);
    }

    private Map<String, Object> baseBody(int status, String error, String message, HttpServletRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status);
        body.put("error", error);
        body.put("message", message);
        body.put("path", request != null ? request.getRequestURI() : null);
        return body;
    }
}
