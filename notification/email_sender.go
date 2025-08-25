package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
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
	// Mailpit usually doesn't require auth/TLS in dev.
	msg := []byte(fmt.Sprintf("To: %s\r\nFrom: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s\r\n", to, s.from, subject, body))
	// Try plain first; if fails and port is 465 with TLS, try TLS.
	if err := smtp.SendMail(addr, nil, s.from, []string{to}, msg); err != nil {
		// fallback TLS
		tlsConfig := &tls.Config{InsecureSkipVerify: true, ServerName: s.host}
		conn, derr := tls.Dial("tcp", addr, tlsConfig)
		if derr != nil {
			return err
		}
		c, cerr := smtp.NewClient(conn, s.host)
		if cerr != nil {
			return err
		}
		defer c.Close()
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
