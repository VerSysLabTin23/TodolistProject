package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strings"
)

type EmailSender struct {
	host string
	port string
	from string
}

func NewEmailSender() *EmailSender {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		host = "mailpit"
	}
	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "1025"
	}
	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = "no-reply@todo.local"
	}
	return &EmailSender{host: host, port: port, from: from}
}

func (s *EmailSender) Send(to, subject, body string) error {
	addr := net.JoinHostPort(s.host, s.port)
	msg := []byte(fmt.Sprintf("To: %s\r\nFrom: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s\r\n", to, s.from, subject, body))

	// Optional AUTH support
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	var auth smtp.Auth
	if smtpUser != "" && smtpPass != "" {
		auth = smtp.PlainAuth("", smtpUser, smtpPass, s.host)
	}

	// First try non-TLS (useful for dev tools like Mailpit)
	if err := smtp.SendMail(addr, auth, s.from, []string{to}, msg); err != nil {
		// Fallback: try TLS if server requires it
		insecure := strings.EqualFold(os.Getenv("SMTP_INSECURE_SKIP_VERIFY"), "true")
		tlsConfig := &tls.Config{InsecureSkipVerify: insecure, ServerName: s.host}
		conn, derr := tls.Dial("tcp", addr, tlsConfig)
		if derr != nil {
			return err
		}
		c, cerr := smtp.NewClient(conn, s.host)
		if cerr != nil {
			return err
		}
		defer c.Close()
		if auth != nil {
			_ = c.Auth(auth)
		}
		if err = c.Mail(s.from); err != nil {
			return err
		}
		if err = c.Rcpt(to); err != nil {
			return err
		}
		wc, err := c.Data()
		if err != nil {
			return err
		}
		if _, err = wc.Write(msg); err != nil {
			return err
		}
		if err = wc.Close(); err != nil {
			return err
		}
		return c.Quit()
	}
	return nil
}
