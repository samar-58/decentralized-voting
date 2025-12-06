use anchor_lang::prelude::*;

declare_id!("AC6AfeEEGnPQFnQ6HzCB4ccAwGLCgRwimKcdZHoyYfBT");

#[program]
pub mod decentralized_voting {
    use super::*;

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: u64,
        question: String,
        options: Vec<String>,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let clock = Clock::get()?;

        require!(options.len() >= 2, VotingError::NotEnoughOptions);
        require!(options.len() <= 10, VotingError::TooManyOptions);
        require!(question.len() <= 200, VotingError::QuestionTooLong);
        require!(start_time >= clock.unix_timestamp, VotingError::StartTimeInPast);
        require!(end_time > start_time, VotingError::EndBeforeStart);

        poll.creator = ctx.accounts.creator.key();
        poll.poll_id = poll_id;
        poll.question = question;
        poll.options = options;
        poll.vote_counts = vec![0u64; poll.options.len()];
        poll.start_time = start_time;
        poll.end_time = end_time;
        poll.is_closed = false;
        poll.bump = ctx.bumps.poll;

        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, choice_index: u8) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let vote_record = &mut ctx.accounts.vote_record;
        let voter = &ctx.accounts.voter;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= poll.start_time, VotingError::PollNotStarted);
        require!(clock.unix_timestamp <= poll.end_time, VotingError::PollEnded);
        require!(!poll.is_closed, VotingError::PollClosed);

        let idx = choice_index as usize;
        require!(idx < poll.options.len(), VotingError::InvalidOption);

        vote_record.poll = poll.key();
        vote_record.voter = voter.key();
        vote_record.choice_index = choice_index;
        vote_record.bump = ctx.bumps.vote_record;

        poll.vote_counts[idx] = poll
            .vote_counts[idx]
            .checked_add(1)
            .ok_or(VotingError::MathOverflow)?;

        Ok(())
    }

    pub fn close_poll(ctx: Context<ClosePoll>) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let clock = Clock::get()?;

        require_keys_eq!(poll.creator, ctx.accounts.creator.key(), VotingError::Unauthorized);

        require!(
            clock.unix_timestamp > poll.end_time,
            VotingError::PollNotEndedYet
        );

        poll.is_closed = true;

        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CreatePoll<'info> {
    #[account(
        init,
        payer = creator,
        space = Poll::SPACE,
        seeds = [b"poll", creator.key().as_ref(), &poll_id.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(
        mut,
        seeds = [b"poll", poll.creator.as_ref(), &poll.poll_id.to_le_bytes()],
        bump = poll.bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init,
        payer = voter,
        space = VoteRecord::SPACE,
        seeds = [b"vote", poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(
        mut,
        seeds = [b"poll", poll.creator.as_ref(), &poll.poll_id.to_le_bytes()],
        bump = poll.bump
    )]
    pub poll: Account<'info, Poll>,

    pub creator: Signer<'info>,
}


#[account]
pub struct Poll {
    pub creator: Pubkey,
    pub poll_id: u64,
    pub question: String,
    pub options: Vec<String>,
    pub vote_counts: Vec<u64>,
    pub start_time: i64,
    pub end_time: i64,
    pub is_closed: bool,
    pub bump: u8,
}

impl Poll {
    // Rough space calculation
    // discriminator: 8
    // creator: 32
    // poll_id: 8
    // question: 4 + 200 bytes max
    // options: 4 + (10 * (4 + 50)) max (assume 50 chars per option)
    // vote_counts: 4 + 10 * 8
    // start_time: 8
    // end_time: 8
    // is_closed: 1
    // bump: 1
    pub const SPACE: usize =
        8 + // discriminator
        32 +
        8 +
        4 + 200 +
        4 + (10 * (4 + 50)) +
        4 + (10 * 8) +
        8 +
        8 +
        1 +
        1;
}

#[account]
pub struct VoteRecord {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub choice_index: u8,
    pub bump: u8,
}

impl VoteRecord {
    // discriminator: 8
    // poll: 32
    // voter: 32
    // choice_index: 1
    // bump: 1
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1;
}


#[error_code]
pub enum VotingError {
    #[msg("Poll must have at least 2 options")]
    NotEnoughOptions,
    #[msg("Poll has too many options")]
    TooManyOptions,
    #[msg("Question is too long")]
    QuestionTooLong,
    #[msg("Start time is in the past")]
    StartTimeInPast,
    #[msg("End time must be after start time")]
    EndBeforeStart,
    #[msg("Poll has not started yet")]
    PollNotStarted,
    #[msg("Poll has already ended")]
    PollEnded,
    #[msg("Poll is closed")]
    PollClosed,
    #[msg("Invalid option index")]
    InvalidOption,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
    #[msg("Poll has not ended yet")]
    PollNotEndedYet,
}
