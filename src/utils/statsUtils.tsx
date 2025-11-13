import { supabase } from "../database/supabaseClient";
import type { Question, Submission } from "../interfaces/interfaces";

/**
 * Beregn poeng for en spesifikk submission
 */
export const calculatePlayerScore = (
  submission: Submission,
  questions: Question[],
  results: Array<{ question_id: number; correct_answer: string }>
): number => {
  let correct = 0;

  questions.forEach((q) => {
    const correctAnswer = results.find((r) => r.question_id === q.id)?.correct_answer;
    const playerAnswer = submission.answers[q.id];
    
    if (correctAnswer && playerAnswer === correctAnswer) {
      correct++;
    }
  });

  return correct;
};

/**
 * Aggreger statistikk for én spiller
 */
export const aggregatePlayerStats = (
  submissions: Submission[],
  allQuestions: Question[],
  allResults: Array<{ question_id: number; correct_answer: string; coupon_id: number }>
) => {
  let totalCorrect = 0;
  let totalQuestions = 0;
  let wins = 0;

  submissions.forEach((sub) => {
    const couponQuestions = allQuestions.filter((q) => q.coupon_id === sub.coupon_id);
    const couponResults = allResults.filter((r) => r.coupon_id === sub.coupon_id);

    const score = calculatePlayerScore(sub, couponQuestions, couponResults);
    totalCorrect += score;
    totalQuestions += couponQuestions.length;

    if (sub.is_winner) {
      wins++;
    }
  });

  const avgScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  return {
    totalPlayed: submissions.length,
    totalCorrect,
    totalQuestions,
    avgScore,
    wins,
  };
};

/**
 * Hent og aggreger statistikk for alle spillere
 */
export const getAllPlayersStats = async () => {
  try {
    // Hent alle submissions
    const { data: submissions, error: subError } = await supabase
      .from("submissions")
      .select("*");

    if (subError) throw subError;

    // Hent alle spørsmål
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*");

    if (qError) throw qError;

    // Hent alle resultater
    const { data: results, error: rError } = await supabase
      .from("results")
      .select("*");

    if (rError) throw rError;

    // Grupper submissions per spiller
    const playerMap = new Map<string, Submission[]>();

    (submissions || []).forEach((sub: Submission) => {
      const playerName = sub.player_name || sub.device_id;
      if (!playerMap.has(playerName)) {
        playerMap.set(playerName, []);
      }
      playerMap.get(playerName)!.push(sub);
    });

    // Beregn stats for hver spiller
    const playersStats = Array.from(playerMap.entries()).map(([name, subs]) => {
      const stats = aggregatePlayerStats(subs, questions || [], results || []);
      return {
        name,
        ...stats,
      };
    });

    return playersStats;
  } catch (err) {
    console.error("Feil ved henting av spillerstatistikk:", err);
    return [];
  }
};

/**
 * Oppdater is_winner for alle submissions i en kupong
 * Kalles når admin lagrer/oppdaterer fasit
 */
export const updateWinners = async (couponId: number | string) => {
  try {
    console.log("🔄 updateWinners kalles for kupong:", couponId, "Type:", typeof couponId);
    
    // Hent alle submissions for kupongen
    const { data: submissions, error: subError } = await supabase
      .from("submissions")
      .select("*")
      .eq("coupon_id", couponId);

    console.log("📦 Submissions:", submissions?.length, "Error:", subError);

    if (subError) throw subError;

    if (!submissions || submissions.length === 0) {
      console.log("⚠️ Ingen submissions for denne kupongen");
      return;
    }

    // Hent alle spørsmål for kupongen
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("coupon_id", couponId);

    console.log("❓ Questions:", questions?.length, "Error:", qError);

    if (qError) throw qError;

    // Hent alle resultater for kupongen
    const { data: results, error: rError } = await supabase
      .from("results")
      .select("*")
      .eq("coupon_id", couponId);

    console.log("✅ Results:", results?.length, "Error:", rError);
    console.log("📋 Results data:", results);

    if (rError) throw rError;

    // Hvis det ikke er fasit enda, sett alle til is_winner = false
    if (!results || results.length === 0) {
      console.log("⚠️ Ingen fasit enda, setter alle is_winner til false");
      const { data: updateData, error: updateError } = await supabase
        .from("submissions")
        .update({ is_winner: false })
        .eq("coupon_id", couponId)
        .select();
      
      console.log("📝 Updated submissions to false:", updateData?.length, "Error:", updateError);
      return;
    }

    // Beregn score for alle submissions
    console.log("🧮 Beregner score for submissions...");
    const scores = submissions.map((sub: Submission) => {
      const score = calculatePlayerScore(sub, questions || [], results || []);
      console.log(`  Spiller ${sub.player_name || sub.device_id.slice(0, 8)}: ${score} poeng`);
      return {
        id: sub.id,
        score,
      };
    });

    // Finn beste score
    const topScore = Math.max(...scores.map((s) => s.score));
    console.log("🏆 Beste score:", topScore);

    // Finn alle submissions med beste score
    const winnerIds = scores.filter((s) => s.score === topScore).map((s) => s.id);
    console.log("👥 Vinner-IDer:", winnerIds);

    // Oppdater is_winner for alle submissions
    // Først sett alle til false
    console.log("📝 Setter alle is_winner til false...");
    const { data: falseData, error: falseError } = await supabase
      .from("submissions")
      .update({ is_winner: false })
      .eq("coupon_id", couponId)
      .select();

    console.log("  Oppdaterte rader (false):", falseData?.length, "Error:", falseError);

    // Så sett vinnerne til true
    if (winnerIds.length > 0) {
      console.log("📝 Setter vinnere til true...");
      const { data: trueData, error: trueError } = await supabase
        .from("submissions")
        .update({ is_winner: true })
        .in("id", winnerIds)
        .select();

      console.log("  Oppdaterte rader (true):", trueData?.length, "Error:", trueError);
      
      if (trueError) {
        console.error("❌ Feil ved setting av vinnere:", trueError);
      }
    }

    console.log(`✅ Oppdatert vinnere for kupong ${couponId}: ${winnerIds.length} vinnere med ${topScore} poeng`);
  } catch (err) {
    console.error("❌ Feil ved oppdatering av vinnere:", err);
  }
};

