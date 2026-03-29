"""
Utility functions for 99x — number and sequence helpers.
"""


def multiples(n, limit=99):
    """Return all positive multiples of n up to limit (inclusive)."""
    return [i for i in range(n, limit + 1, n)]


def is_prime(n):
    """Return True if n is a prime number."""
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(n ** 0.5) + 1, 2):
        if n % i == 0:
            return False
    return True


def primes_up_to(limit):
    """Return a list of all prime numbers up to limit (inclusive)."""
    if limit < 2:
        return []
    sieve = bytearray([1]) * (limit + 1)
    sieve[0] = sieve[1] = 0
    for i in range(2, int(limit ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i::i] = bytearray(len(sieve[i * i::i]))
    return [i for i, v in enumerate(sieve) if v]


def fizzbuzz(n):
    """Return the FizzBuzz string for n."""
    if n % 15 == 0:
        return "FizzBuzz"
    if n % 3 == 0:
        return "Fizz"
    if n % 5 == 0:
        return "Buzz"
    return str(n)
