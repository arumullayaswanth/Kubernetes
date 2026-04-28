package service

import (
	"context"

	"payment-service/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Init(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS payments (
			id UUID PRIMARY KEY,
			order_id UUID NOT NULL,
			amount NUMERIC(10,2) NOT NULL,
			method VARCHAR(100) NOT NULL,
			status VARCHAR(50) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func (r *Repository) Ping(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, "SELECT 1")
	return err
}

func (r *Repository) CreatePayment(ctx context.Context, payment models.Payment) error {
	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO payments (id, order_id, amount, method, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		payment.ID,
		payment.OrderID,
		payment.Amount,
		payment.Method,
		payment.Status,
		payment.CreatedAt,
	)
	return err
}

func (r *Repository) ListPayments(ctx context.Context) ([]models.Payment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, order_id::text, amount::float8, method, status, created_at
		FROM payments
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	payments := make([]models.Payment, 0)
	for rows.Next() {
		var payment models.Payment
		if err := rows.Scan(
			&payment.ID,
			&payment.OrderID,
			&payment.Amount,
			&payment.Method,
			&payment.Status,
			&payment.CreatedAt,
		); err != nil {
			return nil, err
		}
		payments = append(payments, payment)
	}
	return payments, rows.Err()
}

func (r *Repository) GetPayment(ctx context.Context, paymentID string) (*models.Payment, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, order_id::text, amount::float8, method, status, created_at
		FROM payments
		WHERE id = $1
	`, paymentID)

	var payment models.Payment
	if err := row.Scan(
		&payment.ID,
		&payment.OrderID,
		&payment.Amount,
		&payment.Method,
		&payment.Status,
		&payment.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &payment, nil
}
