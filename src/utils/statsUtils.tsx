import { supabase } from "../database/supabaseClient";
import type { Question, Submission } from "../interfaces/interfaces";

/**
 * Beregn score for en spesifikk submission
 * Returnerer både antall riktige og total poengsum
 */
export const calculatePlayerScore = (
  submission: Submission,
  questions: Question[],
  results: Array<{ question_id: number; correct_answer: string }>
): { correct: number; points: number } => {
  let correct = 0;
  let totalPoints = 0;

  questions.forEach((q) => {
    const correctAnswer = results.find((r) => r.question_id === q.id)?.correct_answer;
    const playerAnswer = submission.answers[q.id];
    
    if (correctAnswer && playerAnswer === correctAnswer) {
      correct++;
      
      // Beregn poeng: bruk option_points hvis det finnes, ellers 1 poeng
      if (q.option_points && q.options) {
        const optionIndex = q.options.indexOf(correctAnswer);
        if (optionIndex !== -1 && q.option_points[optionIndex] !== undefined) {
          totalPoints += q.option_points[optionIndex];
        } else {
          totalPoints += 1; // Fallback hvis option_points mangler for dette alternativet
        }
      } else {
        totalPoints += 1; // Standard 1 poeng for spørsmål uten option_points
      }
    }
  });

  return { correct, points: totalPoints };
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
  let totalPoints = 0;
  let totalQuestions = 0;
  let totalPlayed = 0;
  let wins = 0;

  submissions.forEach((sub) => {
    const couponQuestions = allQuestions.filter((q) => q.coupon_id === sub.coupon_id);
    const couponResults = allResults.filter((r) => r.coupon_id === sub.coupon_id);

    // Kun tell submissions fra kuponger som har fasit
    if (couponResults.length > 0) {
      const score = calculatePlayerScore(sub, couponQuestions, couponResults);
      totalCorrect += score.correct;
      totalPoints += score.points;
      totalQuestions += couponQuestions.length;
      totalPlayed++; // Tell kun kuponger med fasit
    }

    if (sub.is_winner) {
      wins++;
    }
  });

  const avgScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  return {
    totalPlayed,
    totalCorrect,
    totalPoints,
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

    // Grupper submissions per device_id (unik spiller)
    const playerMap = new Map<string, Submission[]>();

    (submissions || []).forEach((sub: Submission) => {
      const deviceId = sub.device_id;
      if (!playerMap.has(deviceId)) {
        playerMap.set(deviceId, []);
      }
      playerMap.get(deviceId)!.push(sub);
    });

    // Beregn stats for hver spiller
    const playersStats = Array.from(playerMap.entries()).map(([deviceId, subs]) => {
      const stats = aggregatePlayerStats(subs, questions || [], results || []);
      
      // Finn nyeste player_name for denne device_id (basert på created_at)
      const sortedSubs = [...subs].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Vis player_name hvis det finnes, ellers forkortet device_id
      const displayName = sortedSubs[0].player_name || (
        deviceId.length > 12 
          ? `${deviceId.slice(0, 8)}...${deviceId.slice(-4)}`
          : deviceId
      );
      
      return {
        name: displayName,
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

    // Beregn score for alle submissions (basert på poeng)
    console.log("🧮 Beregner score for submissions...");
    const scores = submissions.map((sub: Submission) => {
      const scoreResult = calculatePlayerScore(sub, questions || [], results || []);
      console.log(`  Spiller ${sub.player_name || sub.device_id.slice(0, 8)}: ${scoreResult.correct} riktige, ${scoreResult.points} poeng`);
      return {
        id: sub.id,
        points: scoreResult.points,
      };
    });

    // Finn beste poengsum
    const topScore = Math.max(...scores.map((s) => s.points));
    console.log("🏆 Beste poengsum:", topScore);

    // Finn alle submissions med beste poengsum
    const winnerIds = scores.filter((s) => s.points === topScore).map((s) => s.id);
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

