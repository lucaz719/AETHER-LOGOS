package proof

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

type SolanaSubmitter struct {
	Client    *rpc.Client
	ProgramID solana.PublicKey
	Payer     solana.PrivateKey
}

func NewSolanaSubmitter(rpcURL, programID, payerPrivateKeyBase58 string) (*SolanaSubmitter, error) {
	programPK, err := solana.PublicKeyFromBase58(programID)
	if err != nil {
		return nil, fmt.Errorf("invalid escrow program id: %w", err)
	}
	payer, err := solana.PrivateKeyFromBase58(payerPrivateKeyBase58)
	if err != nil {
		return nil, fmt.Errorf("invalid payer private key: %w", err)
	}
	return &SolanaSubmitter{
		Client:    rpc.New(rpcURL),
		ProgramID: programPK,
		Payer:     payer,
	}, nil
}

func SubmitProofDiscriminator() [8]byte {
	hash := sha256.Sum256([]byte("global:submit_proof"))
	var discriminator [8]byte
	copy(discriminator[:], hash[:8])
	return discriminator
}

func (s *SolanaSubmitter) SubmitProof(
	ctx context.Context,
	tradeAccount solana.PublicKey,
	tradeID [16]byte,
	proofData []byte,
) (solana.Signature, error) {
	discriminator := SubmitProofDiscriminator()
	payload := make([]byte, 0, 8+16+4+len(proofData))
	payload = append(payload, discriminator[:]...)
	payload = append(payload, tradeID[:]...)
	lenBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(lenBuf, uint32(len(proofData)))
	payload = append(payload, lenBuf...)
	payload = append(payload, proofData...)

	accounts := []*solana.AccountMeta{
		{PublicKey: s.Payer.PublicKey(), IsSigner: true, IsWritable: false},
		{PublicKey: tradeAccount, IsSigner: false, IsWritable: true},
	}
	ix := solana.NewInstruction(s.ProgramID, accounts, payload)
	recent, err := s.Client.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return solana.Signature{}, fmt.Errorf("get blockhash: %w", err)
	}
	tx, err := solana.NewTransaction(
		[]solana.Instruction{ix},
		recent.Value.Blockhash,
		solana.TransactionPayer(s.Payer.PublicKey()),
	)
	if err != nil {
		return solana.Signature{}, fmt.Errorf("build transaction: %w", err)
	}
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(s.Payer.PublicKey()) {
			return &s.Payer
		}
		return nil
	})
	if err != nil {
		return solana.Signature{}, fmt.Errorf("sign transaction: %w", err)
	}
	sig, err := s.Client.SendTransactionWithOpts(
		ctx,
		tx,
		rpc.TransactionOpts{
			SkipPreflight:       false,
			PreflightCommitment: rpc.CommitmentProcessed,
		},
	)
	if err != nil {
		return solana.Signature{}, fmt.Errorf("send transaction: %w", err)
	}
	return sig, nil
}
